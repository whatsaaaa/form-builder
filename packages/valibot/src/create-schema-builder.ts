import * as v from 'valibot'
import { defaultFieldTypes } from './field-types'
import { defaultRules } from './rules'
import type {
  AnyAction,
  AnySchema,
  FieldTypeDef,
  JsonField,
  JsonFormSchema,
  JsonRule,
  RuleDef,
  ValueKind,
} from './types'

export interface SchemaBuilderOptions {
  fieldTypes?: Record<string, FieldTypeDef>
  rules?: Record<string, RuleDef>
}

export function createSchemaBuilder(opts: SchemaBuilderOptions = {}) {
  const fieldTypes: Record<string, FieldTypeDef> = { ...defaultFieldTypes, ...opts.fieldTypes }
  const rules: Record<string, RuleDef> = { ...defaultRules, ...opts.rules }

  function buildAction(rule: JsonRule, kind: ValueKind, at: string): AnyAction {
    const def = rules[rule.rule]
    if (!def) throw new Error(`${at}: unknown rule "${rule.rule}"`)
    if (!def.kinds.includes(kind))
      throw new Error(`${at}: rule "${rule.rule}" can't be used on ${kind} fields`)

    const parsed = v.safeParse(def.params, rule)
    if (!parsed.success)
      throw new Error(`${at}: invalid params for "${rule.rule}"\n${v.summarize(parsed.issues)}`)

    return def.create(parsed.output, rule.message)
  }

  function buildField(field: JsonField, i: number): AnySchema {
    const at = `fields[${i}] "${field.name}"`
    const type = fieldTypes[field.type]
    if (!type) throw new Error(`${at}: unknown field type "${field.type}"`)

    const userRules = field.rules ?? []
    const overridden = new Set(userRules.map((r) => r.rule))
    const allRules = [
      ...(type.defaultRules ?? []).filter((r) => !overridden.has(r.rule)),
      ...userRules,
    ]

    const required = !!field.required
    const requiredMsg = typeof field.required === 'object' ? field.required.message : undefined

    const actions: AnyAction[] = []

    if (required && type.kind === 'string') {
      actions.push(v.nonEmpty(requiredMsg ?? 'Required'))
    }

    allRules.forEach((r, j) => {
      actions.push(buildAction(r, type.kind, `${at}.rules[${j}]`))
    })

    const schema = actions.reduce<AnySchema>((s, a) => v.pipe(s, a), type.base(requiredMsg))

    if (required) return schema

    return type.kind === 'string'
      ? v.optional(v.union([v.literal(''), schema]))
      : v.optional(schema)
  }

  return function build(json: JsonFormSchema) {
    const entries: v.ObjectEntries = {}

    json.fields.forEach((field, i) => {
      if (field.name in entries) throw new Error(`fields[${i}]: duplicate name "${field.name}"`)
      entries[field.name] = buildField(field, i)
    })

    return v.object(entries)
  }
}
