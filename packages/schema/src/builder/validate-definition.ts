import * as v from 'valibot'
import type { JsonField, JsonRule } from '../definition/json-form-schema'
import {
  type DefinitionPath,
  type DefinitionIssue,
  type DefinitionIssueCode,
  formatPath,
} from '../errors/definition-error'
import type { FieldTypeDef, KindOf } from '../field-types/field-type-def'
import type { KindDef } from '../kinds/kind-def'
import type { RuleDef } from '../rules/rule-def'
import { paramsFor } from '../rules/rule-params'
import { lookup, type Registry } from './registry'
import { isReservedFieldKey, isReservedRuleKey } from '../shared/reserved-keys'
import type { ValueKind } from '../shared/value-kind'

export interface CheckedField {
  name: string
  field: JsonField
  path: DefinitionPath
  type: FieldTypeDef
  kind: KindDef
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
  ui: v.optional(v.record(v.string(), v.unknown())),
})
const ruleShape = v.looseObject({ rule: v.string(), message: v.optional(v.string()) })
const noParams = v.object({})

/**
 * Checks one field's shape, name, type, props and rules, and adds its issues to `issues`.
 * Returns the field ready to build, or undefined when it has issues or no value.
 */
export function checkField(
  raw: unknown,
  path: DefinitionPath,
  registry: Registry,
  names: Set<string>,
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
  // Only a fixed kind can be 'none'. A kind() function that returns it throws in kindDef.
  const hasValue = type?.kind !== 'none'

  if (!field.name) {
    if (type && hasValue) {
      issues.push(issue('missing_name', [...path, 'name'], 'A field needs a name'))
    }
  } else if (hasValue) {
    if (names.has(field.name)) {
      issues.push(issue('duplicate_name', [...path, 'name'], `Duplicate name "${field.name}"`))
    }
    names.add(field.name)
  }

  if (!type) {
    issues.push(issue('unknown_type', [...path, 'type'], `Unknown field type "${field.type}"`))
    return undefined
  }

  const props = checkProps(field, type, path, issues)

  if (!hasValue) {
    for (const key of ['required', 'rules'] as const) {
      if (field[key] !== undefined) {
        const message = `A "${field.type}" field has no value, so it can't have "${key}"`
        issues.push(issue('invalid_shape', [...path, key], message))
      }
    }
    return undefined
  }

  // A kind that comes from a function needs the parsed props. Without them, the rules can't be
  // checked either; the props issues are reported already.
  const withProps = props && { ...field, ...props }
  const kind = resolveKind(type.kind, withProps)
  if (kind === undefined) return undefined
  const kinds: FieldKinds = {
    kind,
    itemKind: kind === 'array' ? resolveKind(type.itemKind, withProps) : undefined,
  }

  const fieldRules = (shape.output.rules ?? []).flatMap(
    (rule, j) => checkRule(rule, kinds, [...path, 'rules', j], registry, issues) ?? [],
  )
  if (issues.length > issueCount || !field.name || !withProps) return undefined

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
    rules: [...defaultRules, ...fieldRules],
  }
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
function checkDefaultRules(
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

function checkProps(
  field: JsonField,
  type: FieldTypeDef,
  path: DefinitionPath,
  issues: DefinitionIssue[],
): Record<string, unknown> | undefined {
  const propKeys = Object.keys(type.props?.entries ?? {})
  const input: Record<string, unknown> = {}

  for (const key of Object.keys(field)) {
    if (isReservedFieldKey(key)) continue
    if (propKeys.includes(key)) {
      input[key] = field[key]
    } else {
      issues.push(
        issue('unknown_key', [...path, key], `Unknown key "${key}" on a "${field.type}" field`),
      )
    }
  }

  if (!type.props) return {}
  const parsed = v.safeParse(type.props, input)
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

  const issueCount = issues.length
  const params = paramsFor(def, each ? (itemKind as ValueKind) : kind)
  const paramKeys = Object.keys(params?.entries ?? {})
  const input: Record<string, unknown> = {}
  for (const key of Object.keys(rule)) {
    if (isReservedRuleKey(key)) continue
    if (paramKeys.includes(key)) {
      input[key] = rule[key]
    } else {
      issues.push(
        issue('unknown_param', [...path, key], `Rule "${rule.rule}" has no param "${key}"`),
      )
    }
  }

  const parsed = v.safeParse(params ?? noParams, input)
  if (!parsed.success) issues.push(...toIssues('invalid_params', path, parsed.issues))
  if (!parsed.success || issues.length > issueCount) return undefined

  return { name: rule.rule, def, params: parsed.output, message: rule.message, each }
}

export function checkRegistry(registry: Registry): void {
  for (const [name, rule] of Object.entries(registry.rules)) {
    // Params can depend on the kind, so check them for every kind the rule supports.
    for (const kind of rule.kinds) {
      for (const key of Object.keys(paramsFor(rule, kind)?.entries ?? {})) {
        if (isReservedRuleKey(key)) {
          throw new TypeError(`Rule "${name}": params can't use the reserved key "${key}"`)
        }
      }
    }
  }

  for (const [name, type] of Object.entries(registry.fieldTypes)) {
    const at = `Field type "${name}"`
    for (const kind of [type.kind, type.itemKind]) {
      if (typeof kind === 'string' && !lookup(registry.kinds, kind)) {
        throw new TypeError(`${at}: kind "${kind}" is not registered`)
      }
    }
    if (type.kind !== 'none' && !type.schema) {
      throw new TypeError(`${at}: schema() is required unless the kind is 'none'`)
    }
    for (const key of Object.keys(type.props?.entries ?? {})) {
      if (isReservedFieldKey(key)) {
        throw new TypeError(`${at}: props can't use the reserved key "${key}"`)
      }
    }

    // A kind from a function is only known per field, so checkField checks those default rules.
    if (typeof type.kind === 'string' && typeof type.itemKind !== 'function') {
      const kinds: FieldKinds = {
        kind: type.kind,
        itemKind: type.kind === 'array' ? type.itemKind : undefined,
      }
      checkDefaultRules(name, type, kinds, registry)
    }
  }
}

function issue(code: DefinitionIssueCode, path: DefinitionPath, message: string): DefinitionIssue {
  return { code, path, message }
}

export function toIssues(
  code: DefinitionIssueCode,
  path: DefinitionPath,
  valibotIssues: readonly v.BaseIssue<unknown>[],
): DefinitionIssue[] {
  return valibotIssues.map((valibotIssue) => {
    const keys = valibotIssue.path?.map((item) => item.key as string | number) ?? []
    return issue(code, [...path, ...keys], valibotIssue.message)
  })
}
