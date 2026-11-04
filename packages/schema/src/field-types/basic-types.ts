import * as v from 'valibot'
import type { FieldTypeDef } from './field-type-def'

/** Types with one plain value and no props. Each maps to a native input. */
export const basicTypes = {
  text: {
    kind: 'string',
    schema: () => v.string(),
    meta: { label: 'Text', description: 'One line of text' },
  },
  textarea: {
    kind: 'string',
    schema: () => v.string(),
    meta: { label: 'Text area', description: 'Several lines of text' },
  },
  email: {
    kind: 'string',
    schema: () => v.string(),
    defaultRules: [{ rule: 'email' }],
    meta: { label: 'Email', description: 'An email address, checked by the email rule' },
  },
  password: {
    kind: 'string',
    schema: () => v.string(),
    meta: { label: 'Password', description: 'Text hidden while typing' },
  },
  url: {
    kind: 'string',
    schema: () => v.string(),
    defaultRules: [{ rule: 'url' }],
    meta: { label: 'URL', description: 'A web address, checked by the url rule' },
  },
  // Phone formats differ per country, so there is no default rule. Add a regex rule for yours.
  tel: {
    kind: 'string',
    schema: () => v.string(),
    meta: { label: 'Phone', description: 'A phone number. Add a regex rule for its format' },
  },
  number: { kind: 'number', schema: () => v.number(), meta: { label: 'Number' } },
  // Required means "must be ticked", e.g. accepting terms.
  checkbox: {
    kind: 'boolean',
    schema: () => v.boolean(),
    meta: { label: 'Checkbox', description: 'Yes or no. Required means it must be ticked' },
  },
} satisfies Record<string, FieldTypeDef>
