import * as v from 'valibot'
import type { JsonField } from '../definition/json-form-schema'
import { defineFieldType } from './define-field-type'
import type { FieldTypeDef } from './field-type-def'

// The builder checks child fields itself, at their own paths, so the props take any value here.
const childField = v.custom<JsonField>(() => true)

/** Types whose value holds other fields. Display elements can go inside them too. */
export const containerTypes = {
  // An object with a key for each of its fields. It is always there, so it can't be required.
  group: defineFieldType({
    kind: 'object',
    container: true,
    props: v.object({ fields: v.array(childField) }),
    schema: (field, ctx) => ctx.buildFields(field.fields, [...ctx.path, 'fields']),
    meta: { label: 'Group', description: 'An object with a key for each of its fields' },
  }),
  // A list. `of` is the field of a list of single values, such as tags; its name isn't used.
  // `fields` makes a list of objects, such as order lines. Rules like minLength count the items.
  array: defineFieldType({
    kind: 'array',
    container: true,
    props: v.pipe(
      v.object({ of: v.optional(childField), fields: v.optional(v.array(childField)) }),
      v.check(
        (props) => (props.of === undefined) !== (props.fields === undefined),
        'Give exactly one of "of" and "fields"',
      ),
    ),
    schema: (field, ctx) =>
      v.array(
        field.of
          ? ctx.buildField(field.of, [...ctx.path, 'of'])
          : ctx.buildFields(field.fields ?? [], [...ctx.path, 'fields']),
      ),
    meta: {
      label: 'List',
      description: 'A list of single values with of, or of objects with fields',
    },
  }),
} satisfies Record<string, FieldTypeDef>
