import * as v from 'valibot'
import type { FieldTypeDef } from './field-type-def'

/** Types with one plain value and no props. Each maps to a native input. */
export const basicTypes = {
  text: { kind: 'string', schema: () => v.string() },
  textarea: { kind: 'string', schema: () => v.string() },
  email: { kind: 'string', schema: () => v.string(), defaultRules: [{ rule: 'email' }] },
  password: { kind: 'string', schema: () => v.string() },
  url: { kind: 'string', schema: () => v.string(), defaultRules: [{ rule: 'url' }] },
  // Phone formats differ per country, so there is no default rule. Add a regex rule for yours.
  tel: { kind: 'string', schema: () => v.string() },
  number: { kind: 'number', schema: () => v.number() },
  // Required means "must be ticked", e.g. accepting terms.
  checkbox: { kind: 'boolean', schema: () => v.boolean() },
} satisfies Record<string, FieldTypeDef>
