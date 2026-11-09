import * as v from 'valibot'
import type { JsonField, JsonFormRule } from '../definition/json-form-schema'
import {
  type DefinitionIssue,
  type DefinitionPath,
  issue,
  toIssues,
} from '../errors/definition-error'
import type { FormRuleDef } from '../rules/form-rule-def'
import { isReservedFormRuleKey } from '../shared/reserved-keys'
import type { ValueKind } from '../shared/value-kind'
import { lookup, type Registry } from './registry'
import { type CheckedField, checkParams } from './validate-definition'

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

/** Every field with a value, by the dot path of its value. A field with issues is null. */
type FieldsByPath = ReadonlyMap<string, CheckedField | null>

// A form rule needs its own message: Valibot's would only say the value is invalid.
const ruleShape = v.looseObject({ rule: v.string(), field: v.string(), message: v.string() })

/**
 * Checks the definition's form rules against the fields the compiler built, and adds their
 * issues to `issues`. Returns the rules that are ready to build.
 */
export function checkFormRules(
  rules: readonly unknown[],
  registry: Registry,
  fieldsByPath: FieldsByPath,
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
  fieldsByPath: FieldsByPath,
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

  const paths = [rule.field, ...def.reads(params)].map((dotPath) => dotPath.split('.'))
  const fields = findReadFields(paths, path, fieldsByPath, issues)
  if (!fields) return undefined

  const mismatch = kindMismatch(
    def,
    fields.map((field) => field.valueKind),
    at,
  )
  if (mismatch) {
    issues.push(issue('kind_mismatch', [...path, 'rule'], mismatch))
    return undefined
  }

  const field = (fields[0] as CheckedField).field
  return { name: rule.rule, def, params, message: rule.message, path, field, paths }
}

/**
 * The fields at `paths`, the first one being the rule's `field`. Adds an issue for each path
 * without a field, and returns undefined when any of them has issues, its own or from here.
 */
function findReadFields(
  paths: readonly string[][],
  path: DefinitionPath,
  fieldsByPath: FieldsByPath,
  issues: DefinitionIssue[],
): CheckedField[] | undefined {
  const fieldKeys = paths[0] as string[]
  const fields = paths.map((keys, i) => {
    const found = findField(keys, fieldsByPath)
    const result = typeof found === 'string' ? found : (outsideItem(keys, fieldKeys) ?? found)
    if (typeof result !== 'string') return result
    // `field` has its own key. The paths from reads() come from the params, so their issues go
    // on the rule.
    issues.push(issue('unknown_field', i === 0 ? [...path, 'field'] : path, result))
    return null
  })
  // A field with issues of its own has them reported already.
  return fields.every((field): field is CheckedField => field !== null) ? fields : undefined
}

/**
 * The field with a value at `keys`. Null when a field on the way has issues of its own, and
 * the issue's message when there is no such field.
 */
function findField(
  keys: readonly string[],
  fieldsByPath: FieldsByPath,
): CheckedField | null | string {
  for (let at = 0; at < keys.length - 1; at++) {
    const found = fieldsByPath.get(keys.slice(0, at + 1).join('.'))
    if (found === null) return null
    // The items of a list of objects have no field of their own. The next key is checked.
    if (found === undefined && keys[at] !== '*') return unknownField(keys, at, fieldsByPath)
  }
  const found = fieldsByPath.get(keys.join('.'))
  return found === undefined ? unknownField(keys, keys.length - 1, fieldsByPath) : found
}

/** The message for `keys` when the key at index `at` has no field. */
function unknownField(keys: readonly string[], at: number, fieldsByPath: FieldsByPath): string {
  const dotPath = keys.join('.')
  const parent = fieldsByPath.get(keys.slice(0, at).join('.'))
  if (parent?.valueKind === 'array' && keys[at] !== '*') {
    const withStar = [...keys.slice(0, at), '*', ...keys.slice(at)].join('.')
    return `Unknown field "${dotPath}". A list's items are read with "*": "${withStar}"`
  }
  return `Unknown field "${dotPath}"`
}

/**
 * A path into the items of a list is read once per item, so `field` must be in the same items.
 * Returns the issue's message when it isn't.
 */
function outsideItem(keys: readonly string[], fieldKeys: readonly string[]): string | undefined {
  const star = keys.lastIndexOf('*')
  const item = (path: readonly string[]) => path.slice(0, star + 1).join('.')
  if (star === -1 || item(keys) === item(fieldKeys)) return undefined
  const list = keys.slice(0, star).join('.')
  const read = keys.join('.')
  return `"${read}" is read from each item of "${list}", so "${fieldKeys.join('.')}" must be too`
}

/** The issue's message when the kinds of the fields a rule reads don't fit it. */
function kindMismatch(
  def: FormRuleDef,
  kinds: readonly ValueKind[],
  at: string,
): string | undefined {
  const allowed = def.kinds
  const wrong = allowed && kinds.find((kind) => !allowed.includes(kind))
  if (wrong !== undefined) return `${at} can't be used on ${wrong} fields`
  const distinct = new Set(kinds)
  if (def.sameKind && distinct.size > 1) {
    return `${at} needs fields of one kind, not ${[...distinct].join(' and ')}`
  }
  return undefined
}
