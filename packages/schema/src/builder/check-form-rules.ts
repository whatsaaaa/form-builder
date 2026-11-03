import * as v from 'valibot'
import type { JsonField, JsonFormRule } from '../definition/json-form-schema'
import type { DefinitionIssue, DefinitionPath } from '../errors/definition-error'
import type { FormRuleDef } from '../rules/form-rule-def'
import { isReservedFormRuleKey } from '../shared/reserved-keys'
import { lookup, type Registry } from './registry'
import { type CheckedField, checkParams, issue, toIssues } from './validate-definition'

export interface CheckedFormRule {
  name: string
  def: FormRuleDef
  params: Record<string, unknown>
  message: string
  /** Where the rule is in the definition, e.g. `['formRules', 0]`. */
  path: DefinitionPath
  /** The field the error shows on. */
  field: JsonField
  /** Where `field` and the paths from `reads()` are, split into keys: `['lines', '*', 'qty']`. */
  paths: string[][]
}

// A form rule needs its own message: Valibot's would only say the value is invalid.
const ruleShape = v.looseObject({ rule: v.string(), field: v.string(), message: v.string() })

/**
 * Checks the definition's form rules against the fields the compiler built, and adds their
 * issues to `issues`. Returns the rules that are ready to build.
 */
export function checkFormRules(
  rules: readonly unknown[],
  registry: Registry,
  fieldsByPath: ReadonlyMap<string, CheckedField | null>,
  issues: DefinitionIssue[],
): CheckedFormRule[] {
  return rules.flatMap(
    (raw, i) => checkFormRule(raw, ['formRules', i], registry, fieldsByPath, issues) ?? [],
  )
}

function checkFormRule(
  raw: unknown,
  path: DefinitionPath,
  registry: Registry,
  fieldsByPath: ReadonlyMap<string, CheckedField | null>,
  issues: DefinitionIssue[],
): CheckedFormRule | undefined {
  const shape = v.safeParse(ruleShape, raw)
  if (!shape.success) {
    issues.push(...toIssues('invalid_shape', path, shape.issues))
    return undefined
  }

  const rule: JsonFormRule = shape.output
  const at = `Form rule "${rule.rule}"`
  const def = lookup(registry.formRules, rule.rule)
  if (!def) {
    issues.push(issue('unknown_rule', [...path, 'rule'], `Unknown form rule "${rule.rule}"`))
    return undefined
  }

  const params = checkParams(rule, def.params, isReservedFormRuleKey, at, path, issues)
  if (!params) return undefined

  const dotPaths = [rule.field, ...def.reads(params)]
  const paths = dotPaths.map((dotPath) => dotPath.split('.'))
  const fieldKeys = paths[0] as string[]
  const issueCount = issues.length
  const fields = dotPaths.map((dotPath, i) => {
    const found = findField(dotPath, fieldsByPath)
    const message =
      typeof found === 'string' ? found : i > 0 && outsideItem(paths[i] as string[], fieldKeys)
    if (!message) return found as CheckedField | null
    // `field` has its own key. The paths from reads() come from the params, so their issues go on
    // the rule.
    issues.push(issue('unknown_field', i === 0 ? [...path, 'field'] : path, message))
    return null
  })
  if (issues.length > issueCount) return undefined

  // A field with issues of its own has them reported already.
  if (fields.some((field) => !field)) return undefined
  const checked = fields as CheckedField[]

  const kinds = checked.map((field) => field.valueKind)
  const wrong = kinds.find((kind) => def.kinds && !def.kinds.includes(kind))
  if (wrong !== undefined) {
    const message = `${at} can't be used on ${wrong} fields`
    issues.push(issue('kind_mismatch', [...path, 'rule'], message))
    return undefined
  }
  if (def.sameKind && new Set(kinds).size > 1) {
    const message = `${at} needs fields of one kind, not ${[...new Set(kinds)].join(' and ')}`
    issues.push(issue('kind_mismatch', [...path, 'rule'], message))
    return undefined
  }

  const field = (checked[0] as CheckedField).field
  return { name: rule.rule, def, params, message: rule.message, path, field, paths }
}

/**
 * The field with a value at `dotPath`. Null when a field on the way has issues of its own, and
 * the issue's message when there is no such field.
 */
function findField(
  dotPath: string,
  fieldsByPath: ReadonlyMap<string, CheckedField | null>,
): CheckedField | null | string {
  const keys = dotPath.split('.')
  let found: CheckedField | null | undefined
  for (let i = 1; i <= keys.length; i++) {
    found = fieldsByPath.get(keys.slice(0, i).join('.'))
    if (found === null) return null
    if (found) continue
    // The items of a list of objects have no field of their own. The next key is checked.
    if (keys[i - 1] === '*' && i < keys.length) continue
    const parent = fieldsByPath.get(keys.slice(0, i - 1).join('.'))
    if (parent?.valueKind === 'array' && keys[i - 1] !== '*') {
      const withStar = [...keys.slice(0, i - 1), '*', ...keys.slice(i - 1)].join('.')
      return `Unknown field "${dotPath}". A list's items are read with "*": "${withStar}"`
    }
    return `Unknown field "${dotPath}"`
  }
  return found ?? `Unknown field "${dotPath}"`
}

/**
 * A path into the items of a list is read once per item, so `field` must be in the same items.
 * Returns the issue's message when it isn't.
 */
function outsideItem(keys: string[], fieldKeys: string[]): string | undefined {
  const star = keys.lastIndexOf('*')
  const item = (path: string[]) => path.slice(0, star + 1).join('.')
  if (star === -1 || item(keys) === item(fieldKeys)) return undefined
  const list = keys.slice(0, star).join('.')
  const read = keys.join('.')
  return `"${read}" is read from each item of "${list}", so "${fieldKeys.join('.')}" must be too`
}
