import * as v from 'valibot'
import type { JsonField } from '../definition/json-form-schema'
import type { AnyAction, AnySchema } from '../shared/valibot-types'
import { buildRuleAction } from './build-rule-action'
import type { Registry } from './registry'

export function buildFieldSchema(field: JsonField, i: number, registry: Registry): AnySchema {
  const at = `fields[${i}] "${field.name}"`
  const type = registry.fieldTypes[field.type]
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
    actions.push(buildRuleAction(r, type.kind, registry, `${at}.rules[${j}]`))
  })

  // An empty number input is not a number, so required ones report it via the type check.
  const baseMsg = required && type.kind === 'number' ? (requiredMsg ?? 'Required') : requiredMsg
  const schema = actions.reduce<AnySchema>((s, a) => v.pipe(s, a), type.base(baseMsg))

  if (required) return schema
  if (type.kind === 'string') return v.optional(v.union([v.literal(''), schema]))

  // A cleared number input holds '', which means "no value".
  const empty = v.pipe(
    v.literal(''),
    v.transform(() => undefined),
  )
  return v.optional(v.union([empty, schema]))
}
