import * as v from 'valibot'
import type { JsonField, JsonRule } from '../definition/json-form'
import {
  type DefinitionIssue,
  type DefinitionPath,
  formatPath,
  issue,
  toIssues,
} from '../errors/definition-error'
import type { FieldTypeDef, KindOf } from '../field-types/field-type-def'
import type { KindDef } from '../kinds/kind-def'
import type { RuleDef } from '../rules/rule-def'
import { paramsFor } from '../rules/rule-params'
import {
  isFutureFieldKey,
  isReservedFieldKey,
  isReservedName,
  isReservedRuleKey,
} from '../shared/reserved-keys'
import type { AnyObjectSchema } from '../shared/valibot-types'
import type { ValueKind } from '../shared/value-kind'
import { isExtensionFieldKey, lookup, type Registry } from './registry'

export interface CheckedField {
  /** Undefined for the field of a list's items, which has no name. */
  name: string | undefined
  field: JsonField
  path: DefinitionPath
  type: FieldTypeDef
  kind: KindDef
  /** The name of the kind, e.g. `'array'`. */
  valueKind: ValueKind
  /** The kind of the items, for a field of kind `array` whose type has one. */
  itemKind: ValueKind | undefined
  rules: CheckedRule[]
}

export interface CheckedRule {
  name: string
  def: RuleDef
  params: Record<string, unknown>
  message?: string
  /** True when the rule runs on each item of an array value, not on the array. */
  each: boolean
}

/** The kind of a field's value, and of its items when the value is an array. */
export interface FieldKinds {
  kind: ValueKind
  itemKind?: ValueKind
}

const fieldShape = v.looseObject({
  name: v.optional(v.string()),
  type: v.string(),
  label: v.optional(v.string()),
  description: v.optional(v.string()),
  placeholder: v.optional(v.string()),
  default: v.optional(v.unknown()),
  required: v.optional(v.union([v.boolean(), v.strictObject({ message: v.optional(v.string()) })])),
  rules: v.optional(v.array(v.unknown())),
  // v.record() takes an array too, and outputs it as an object.
  ui: v.optional(
    v.pipe(
      v.unknown(),
      v.check((ui) => !Array.isArray(ui), 'Use an object, not an array'),
      v.record(v.string(), v.unknown()),
    ),
  ),
})
const ruleShape = v.looseObject({ rule: v.string(), message: v.optional(v.string()) })
const noKeys = v.object({})

/**
 * Checks one field's shape, name, type, props and rules, and adds its issues to `issues`.
 * Returns the field ready to build, or undefined when it has issues or no value.
 *
 * `names` holds the names used so far at this level. It is undefined for the field of a list's
 * items, which needs no name.
 */
export function checkField(
  raw: unknown,
  path: DefinitionPath,
  registry: Registry,
  names: Set<string> | undefined,
  issues: DefinitionIssue[],
): CheckedField | undefined {
  const shape = v.safeParse(fieldShape, raw)
  if (!shape.success) {
    issues.push(...toIssues('invalid_shape', path, shape.issues))
    return undefined
  }

  const field = shape.output as JsonField
  const issueCount = issues.length
  const type = lookup(registry.fieldTypes, field.type)

  if (names) checkName(field, type, path, names, issues)

  if (!type) {
    issues.push(issue('unknown_type', [...path, 'type'], `Unknown field type "${field.type}"`))
    return undefined
  }

  const props = checkProps(raw as JsonField, type, path, registry, issues)

  // Only a fixed kind can be 'none'. A kind() function that returns it throws in kindDef.
  if (type.kind === 'none') {
    const noValue = `A "${field.type}" field has no value`
    rejectKeys(field, ['default', 'required', 'rules'], noValue, path, issues)
    if (!names) {
      const message = `A list's items need a value, and a "${field.type}" field has none`
      issues.push(issue('invalid_shape', [...path, 'type'], message))
    }
    return undefined
  }

  const withProps = props && { ...field, ...props }
  const kinds = resolveKinds(type, withProps)
  if (!kinds) return undefined
  const { kind } = kinds

  // A group is always there, and its fields decide what is required.
  if (type.container && kind === 'object') {
    rejectKeys(
      field,
      ['required', 'default'],
      `A "${field.type}" field is always there`,
      path,
      issues,
    )
  }

  const fieldRules = (shape.output.rules ?? []).flatMap(
    (rule, j) => checkRule(rule, kinds, [...path, 'rules', j], registry, issues) ?? [],
  )
  if (issues.length > issueCount || !withProps) return undefined

  const overridden = new Set(fieldRules.map((rule) => rule.name))
  const defaultRules = checkDefaultRules(field.type, type, kinds, registry).filter(
    (rule) => !overridden.has(rule.name),
  )

  return {
    name: field.name,
    field: withProps,
    path,
    type,
    kind: kindDef(field.type, kind, registry),
    valueKind: kind,
    itemKind: kinds.itemKind,
    rules: [...defaultRules, ...fieldRules],
  }
}

/**
 * Checks the name of a field in a list of fields, and adds it to `names`. A field without a
 * value needs no name, and its name is no key of the value, so it isn't checked.
 */
function checkName(
  field: JsonField,
  type: FieldTypeDef | undefined,
  path: DefinitionPath,
  names: Set<string>,
  issues: DefinitionIssue[],
): void {
  if (type?.kind === 'none') return
  if (!field.name) {
    // Without a type, it isn't known whether the field has a value.
    if (type) issues.push(issue('missing_name', [...path, 'name'], 'A field needs a name'))
    return
  }
  const invalid = invalidName(field.name)
  if (invalid) issues.push(issue('invalid_name', [...path, 'name'], invalid))
  if (names.has(field.name)) {
    issues.push(issue('duplicate_name', [...path, 'name'], `Duplicate name "${field.name}"`))
  }
  names.add(field.name)
}

/**
 * Why a name can't be one key of the value, or undefined when it can. Paths like 'address.city'
 * and 'lines[0]' use '.', '[' and ']' as separators.
 */
function invalidName(name: string): string | undefined {
  if (/[.[\]]/.test(name)) return `Name "${name}" can't contain ".", "[" or "]"`
  if (isReservedName(name)) return `Name "${name}" is reserved`
  return undefined
}

/** Reports each of `keys` the field has. `reason` says why it can't have them. */
function rejectKeys(
  field: JsonField,
  keys: readonly ('required' | 'rules' | 'default')[],
  reason: string,
  path: DefinitionPath,
  issues: DefinitionIssue[],
): void {
  for (const key of keys) {
    if (field[key] !== undefined) {
      issues.push(issue('invalid_shape', [...path, key], `${reason}, so it can't have "${key}"`))
    }
  }
}

/**
 * The kinds of a field. A kind that comes from a function needs the parsed props, so without
 * them, the kinds are undefined. The rules can't be checked then either, and the props issues are
 * reported already.
 */
function resolveKinds(type: FieldTypeDef, field: JsonField | undefined): FieldKinds | undefined {
  const kind = resolveKind(type.kind, field)
  if (kind !== 'array') return kind === undefined ? undefined : { kind }
  if (typeof type.itemKind === 'function' && !field) return undefined
  return { kind, itemKind: resolveKind(type.itemKind, field) }
}

function resolveKind(
  kind: ValueKind | KindOf | undefined,
  field: JsonField | undefined,
): ValueKind | undefined {
  if (typeof kind !== 'function') return kind
  return field && kind(field)
}

/** A kind that doesn't fit is a mistake in the field type, not in the definition. */
function kindDef(typeName: string, kind: ValueKind, registry: Registry): KindDef {
  const at = `Field type "${typeName}"`
  if (kind === 'none') throw new TypeError(`${at}: kind() can't return 'none'`)
  const def = lookup(registry.kinds, kind)
  if (!def) throw new TypeError(`${at}: kind "${kind}" is not registered`)
  return def
}

/** Throws for a default rule that doesn't fit, because that is a mistake in the type. */
export function checkDefaultRules(
  typeName: string,
  type: FieldTypeDef,
  kinds: FieldKinds,
  registry: Registry,
): CheckedRule[] {
  const issues: DefinitionIssue[] = []
  const rules = (type.defaultRules ?? []).flatMap(
    (rule, j) => checkRule(rule, kinds, ['defaultRules', j], registry, issues) ?? [],
  )
  const [first] = issues
  if (first) {
    throw new TypeError(`Field type "${typeName}": ${formatPath(first.path)}: ${first.message}`)
  }
  return rules
}

/**
 * Checks the props of a field: every key that this package or an extension doesn't read must be
 * one of its type's props, and together they must pass them. Returns the parsed props, or
 * undefined when they fail. The extensions check their own keys. `field` is the input itself: see
 * `pickKeys`.
 */
function checkProps(
  field: JsonField,
  type: FieldTypeDef,
  path: DefinitionPath,
  registry: Registry,
  issues: DefinitionIssue[],
): Record<string, unknown> | undefined {
  // A key kept for a later version has no meaning yet, so it is unknown too.
  const isOwnKey = (key: string) =>
    (isReservedFieldKey(key) && !isFutureFieldKey(key)) || isExtensionFieldKey(registry, key)
  const input = pickKeys(field, type.props, isOwnKey, issues, (key) =>
    issue(
      'unknown_key',
      [...path, key],
      isFutureFieldKey(key)
        ? `Key "${key}" is reserved for a later version`
        : `Unknown key "${key}" on a "${field.type}" field`,
    ),
  )
  const parsed = v.safeParse(type.props ?? noKeys, input)
  if (parsed.success) return parsed.output
  issues.push(...toIssues('invalid_props', path, parsed.issues))
  return undefined
}

export function checkRule(
  raw: unknown,
  { kind, itemKind }: FieldKinds,
  path: DefinitionPath,
  registry: Registry,
  issues: DefinitionIssue[],
): CheckedRule | undefined {
  const shape = v.safeParse(ruleShape, raw)
  if (!shape.success) {
    issues.push(...toIssues('invalid_shape', path, shape.issues))
    return undefined
  }

  const rule: JsonRule = shape.output
  const def = lookup(registry.rules, rule.rule)
  if (!def) {
    issues.push(issue('unknown_rule', [...path, 'rule'], `Unknown rule "${rule.rule}"`))
    return undefined
  }

  // A rule for the items of an array, but not for arrays, runs on each item.
  const each = !def.kinds.includes(kind) && !!itemKind && def.kinds.includes(itemKind)

  // Params can depend on the kind, so they can't be checked for a kind the rule doesn't support.
  if (!def.kinds.includes(kind) && !each) {
    const items = itemKind ? ` or their ${itemKind} items` : ''
    const message = `Rule "${rule.rule}" can't be used on ${kind} fields${items}`
    issues.push(issue('kind_mismatch', [...path, 'rule'], message))
    return undefined
  }

  const params = checkParams(
    raw as JsonRule,
    paramsFor(def, each ? (itemKind as ValueKind) : kind),
    isReservedRuleKey,
    `Rule "${rule.rule}"`,
    path,
    issues,
  )
  if (!params) return undefined

  return { name: rule.rule, def, params, message: rule.message, each }
}

/**
 * Checks the params of a rule or a form rule. Every key that isn't reserved must be one of
 * `params`, and together they must pass it. Returns the parsed params, or undefined when they
 * have issues. `at` names the rule in messages, e.g. `Rule "minLength"`.
 */
export function checkParams(
  raw: Record<string, unknown>,
  params: AnyObjectSchema | undefined,
  isReserved: (key: string) => boolean,
  at: string,
  path: DefinitionPath,
  issues: DefinitionIssue[],
): Record<string, unknown> | undefined {
  const issueCount = issues.length
  const input = pickKeys(raw, params, isReserved, issues, (key) =>
    issue('unknown_param', [...path, key], `${at} has no param "${key}"`),
  )
  const parsed = v.safeParse(params ?? noKeys, input)
  if (!parsed.success) issues.push(...toIssues('invalid_params', path, parsed.issues))
  if (!parsed.success || issues.length > issueCount) return undefined
  return parsed.output
}

/**
 * The keys of `raw` that are entries of `schema`, to parse with it. Reserved keys are skipped,
 * and every other key adds the issue `unknown` gives for it. `raw` is the input itself, not
 * Valibot's output of it, which leaves out keys like `constructor` that must be reported too.
 */
function pickKeys(
  raw: Record<string, unknown>,
  schema: AnyObjectSchema | undefined,
  isReserved: (key: string) => boolean,
  issues: DefinitionIssue[],
  unknown: (key: string) => DefinitionIssue,
): Record<string, unknown> {
  const known = new Set(Object.keys(schema?.entries ?? {}))
  const picked: Record<string, unknown> = {}
  for (const key of Object.keys(raw)) {
    if (isReserved(key)) continue
    if (known.has(key)) {
      picked[key] = raw[key]
    } else {
      issues.push(unknown(key))
    }
  }
  return picked
}
