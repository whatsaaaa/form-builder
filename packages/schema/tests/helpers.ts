import * as v from 'valibot'
import type { JsonField, JsonForm } from '@whatsaaaa/form-builder-schema'

export const form = (...fields: JsonField[]): JsonForm => ({ version: '1', fields })

/** The messages Valibot reports for `input`. */
export const messages = (schema: v.GenericSchema, input: unknown) =>
  v.safeParse(schema, input).issues?.map((issue) => issue.message) ?? []
