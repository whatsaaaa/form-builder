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
  }),
} satisfies Record<string, FieldTypeDef>
