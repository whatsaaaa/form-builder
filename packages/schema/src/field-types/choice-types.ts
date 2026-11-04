import * as v from 'valibot'
import type { ValueKind } from '../shared/value-kind'
import { defineFieldType } from './define-field-type'
import type { FieldTypeDef } from './field-type-def'

type OptionValue = string | number | boolean
type Option = { value: OptionValue; label: string }

const options = <TValue extends v.GenericSchema<OptionValue>>(value: TValue) =>
  v.pipe(
    v.array(v.object({ value, label: v.string() })),
    v.minLength(1, 'Give at least one option'),
    v.check(
      (items) => new Set(items.map((item) => typeof item.value)).size <= 1,
      'Give every option a value of the same type',
    ),
    v.check(
      (items) => new Set(items.map((item) => item.value)).size === items.length,
      'Give every option a different value',
    ),
  )

const stringOrNumber = v.union([v.string(), v.number()])
const anyValue = v.union([v.string(), v.number(), v.boolean()])

/** The options' value type. Every option has the same one. */
const kindOf = (items: readonly Option[]): ValueKind => {
  const [first] = items
  return first ? typeof first.value : 'string'
}

/** One of the option values. `v.picklist` can't hold booleans, so this is a union of literals. */
const oneOf = (items: readonly Option[]) => v.union(items.map((item) => v.literal(item.value)))

export const choiceTypes = {
  select: defineFieldType({
    kind: (field) => (field.options ? kindOf(field.options) : (field.valueType ?? 'string')),
    props: v.object({
      options: v.optional(options(stringOrNumber)),
      /** The value's type while `options` is missing, e.g. until they load from an API. */
      valueType: v.optional(v.picklist(['string', 'number'])),
    }),
    schema: (field) => {
      if (field.options) return oneOf(field.options)
      return field.valueType === 'number' ? v.number() : v.string()
    },
    meta: { label: 'Select', description: 'One of the options, or any value while they load' },
  }),
  radio: defineFieldType({
    kind: (field) => kindOf(field.options),
    props: v.object({ options: options(anyValue) }),
    schema: (field) => oneOf(field.options),
    // Any option counts as an answer, so a required yes/no radio accepts "no". The empty check
    // already rejects a radio with nothing picked.
    required: () => null,
    meta: { label: 'Radio buttons', description: 'One of the options' },
  }),
  // A checkbox group is a multiselect with `ui: { widget: 'checkboxes' }`.
  multiselect: defineFieldType({
    kind: 'array',
    itemKind: (field) => kindOf(field.options),
    props: v.object({ options: options(stringOrNumber) }),
    schema: (field) => v.array(oneOf(field.options)),
    meta: { label: 'Multiselect', description: 'Any number of the options' },
  }),
} satisfies Record<string, FieldTypeDef>
