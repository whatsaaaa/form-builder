import * as v from "valibot";
import type { JsonField, JsonRule } from "../definition/json-form-schema";
import { type DefinitionPath, type DefinitionIssue, type DefinitionIssueCode, formatPath } from "../errors/definition-error";
import type { FieldTypeDef } from "../field-types/field-type-def";
import type { KindDef } from "../kinds/kind-def";
import type { RuleDef } from "../rules/rule-def";
import { lookup, type Registry } from "./registry";
import { isReservedFieldKey, isReservedRuleKey } from "../shared/reserved-keys";
import type { ValueKind } from "../shared/value-kind";

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
}

interface CheckResult {
  issues: DefinitionIssue[]
  fields: CheckedField[]
}

const formShape = v.object({ version: v.string(), fields: v.array(v.unknown()) })
const fieldShape = v.looseObject({
  name: v.optional(v.string()),
  type: v.string(),
  label: v.optional(v.string()),
  description: v.optional(v.string()),
  placeholder: v.optional(v.string()),
  default: v.optional(v.unknown()),
  required: v.optional(v.union([v.boolean(), v.strictObject({ message: v.optional(v.string()) })])),
  rules: v.optional(v.array(v.unknown())),
  ui: v.optional(v.record(v.string(), v.unknown()))
})
const ruleShape = v.looseObject({ rule: v.string(), message: v.optional(v.string()) })
const noParams = v.object({})

/**
 * Checks a whole definition and collects every issue, in document order. Never throws.
 */
export function checkDefinition(json: unknown, registry: Registry): CheckResult {
  const issues: DefinitionIssue[] = []
  const fields: CheckedField[] = []

  const form = v.safeParse(formShape, json)
  if (!form.success) return { issues: toIssues('invalid_shape', [], form.issues), fields }

  if (form.output.version !== '1') {
    const message = `Unsupported version "${form.output.version}". This package reads version '1'.`
    return { issues: [{ code: 'unsupported_version', path: ['version'], message }], fields }
  }

  const names = new Set<string>()
  form.output.fields.forEach((raw, i) => {
    const field = checkField(raw, ['fields', i], registry, names, issues)
    if (field) fields.push(field)
  })

  return { issues, fields }
}

function checkField(
  raw: unknown,
  path: DefinitionPath,
  registry: Registry,
  names: Set<string>,
  issues: DefinitionIssue[]
): CheckedField | undefined {
  const shape = v.safeParse(fieldShape, raw)
  if (!shape.success) {
    issues.push(...toIssues('invalid_shape', path, shape.issues))
    return undefined
  }

  const field = shape.output as JsonField
  const issueCount = issues.length
  const type = lookup(registry.fieldTypes, field.type)
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
    return undefined;
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

  const fieldRules = (shape.output.rules ?? []).flatMap(
    (rule, j) => checkRule(rule, type?.kind, [...path, 'rules', j], registry, issues) ?? []
  )
  if (issues.length > issueCount || !field.name) return undefined

  const overridden = new Set(fieldRules.map((rule) => rule.name))
  const defaultRules = (type?.defaultRules ?? [])
    .filter((rule) => !overridden.has(rule.rule))
    .flatMap((rule) => checkRule(rule, type?.kind, path, registry, []) ?? [])

  return {
    name: field.name,
    field: { ...field, ...props },
    path,
    type,
    kind: registry.kinds[type?.kind] as KindDef,
    rules: [...defaultRules, ...fieldRules]
  }
}

function checkProps(
  field: JsonField,
  type: FieldTypeDef,
  path: DefinitionPath,
  issues: DefinitionIssue[]
): Record<string, unknown> {
  const propKeys = Object.keys(type.props?.entries ?? {})
  const input: Record<string, unknown> = {}

  for (const key of Object.keys(field)) {
    if (isReservedFieldKey(key)) continue
    if (propKeys.includes(key)) {
      input[key] = field[key]
    } else {
      issues.push(issue('unknown_key', [...path, key], `Unknown key "${key}" on a "${field.type}" field`))
    }
  }

  if (!type.props) return {}
  const parsed = v.safeParse(type.props, input)
  if (parsed.success) return parsed.output
  issues.push(...toIssues('invalid_props', path, parsed.issues))
  return {}
}

export function checkRule(
  raw: unknown,
  kind: ValueKind,
  path: DefinitionPath,
  registry: Registry,
  issues: DefinitionIssue[]
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

  const issueCount = issues.length
  if (!def.kinds.includes(kind)) {
    const message = `Rule "${rule.rule} can't be used on ${kind} fields`
    issues.push(issue('kind_mismatch', [...path, 'rule'], message))
  }

  const paramKeys = Object.keys(def.params?.entries ?? {})
  const input: Record<string, unknown> = {}
  for (const key of Object.keys(rule)) {
    if (isReservedRuleKey(key)) continue
    if (paramKeys.includes(key)) {
      input[key] = rule[key]
    } else {
      issues.push(issue('unknown_param', [...path, key], `Rule "${rule.rule}" has no param "${key}"`))
    }
  }

  const parsed = v.safeParse(def.params ?? noParams, input)
  if (!parsed.success) issues.push(...toIssues('invalid_params', path, parsed.issues))
  if (!parsed.success || issues.length > issueCount) return undefined

  return { name: rule.rule, def, params: parsed.output, message: rule.message }
}

export function checkRegistry(registry: Registry): void {
  for (const [name, rule] of Object.entries(registry.rules)) {
    for (const key of Object.keys(rule.params?.entries ?? {})) {
      if (isReservedRuleKey(key)) {
        throw new TypeError(`Rule "${name}": params can't use the reserved key "${key}"`)
      }
    }
  }

  for (const [name, type] of Object.entries(registry.fieldTypes)) {
    const at = `Field type "${name}"`
    if (!lookup(registry.kinds, type.kind)) {
      throw new TypeError(`${at}: kind "${type.kind}" is not registered`)
    }
    if (type.kind !== 'none' && !type.schema) {
      throw new TypeError(`${at}: schema() is required unless the kind is 'none'`)
    }
    for (const key of Object.keys(type.props?.entries ?? {})) {
      if (isReservedFieldKey(key)) {
        throw new TypeError(`${at}: props can't use the reserved key "${key}"`)
      }
    }

    const issues: DefinitionIssue[] = []
    type.defaultRules?.forEach((rule, j) => {
      checkRule(rule, type.kind, ['defaultRules', j], registry, issues)
    })
    const [first] = issues
    if (first) throw new TypeError(`${at}: ${formatPath(first.path)}: ${first.message}`)
  }
}

function issue(code: DefinitionIssueCode, path: DefinitionPath, message: string): DefinitionIssue {
  return { code, path, message }
}

function toIssues(
  code: DefinitionIssueCode,
  path: DefinitionPath,
  valibotIssues: readonly v.BaseIssue<unknown>[]
): DefinitionIssue[] {
  return valibotIssues.map((valibotIssue) => {
    const keys = valibotIssue.path?.map((item) => item.key as string | number) ?? []
    return issue(code, [...path, ...keys], valibotIssue.message)
  })
}
