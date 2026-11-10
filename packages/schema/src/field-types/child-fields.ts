import * as v from 'valibot'
import type { JsonField } from '../definition/json-form'

// The builder checks child fields itself, at their own paths, so these take any value. They are
// two named schemas so toJsonSchema() can tell them apart and point each at the right fields.

/** A field in a list of fields, such as a group's `fields`. It needs a name. */
export const childField = v.custom<JsonField>(() => true)

/** The field of a list's items, such as an array's `of`. It needs no name. */
export const itemField = v.custom<JsonField>(() => true)
