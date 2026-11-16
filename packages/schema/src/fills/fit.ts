import * as v from 'valibot'
import { coerceInput } from '../render/coerce-input'
import type { FillField } from './fill-plan'

/** A value fitted to its field: the input to set, and why it didn't fit, if it didn't. */
export interface Fitted {
  readonly input: unknown
  readonly error?: TypeError
}

/** A field's input with no value: `[]` for an array, otherwise undefined. */
export const blankOf = (field: Pick<FillField, 'kind'>): unknown =>
  field.kind === 'array' ? [] : undefined

/**
 * Fits a value to its field: as an input element's would be, by `coerceInput`, with a number taken
 * as text by a field of kind `string`, then checked by the field's schema. A value of a type the
 * field can't hold is blank, with a TypeError. One that only breaks a rule, like an email without
 * `@`, fits: the form shows its error, as for the user's own input.
 */
export function fit(raw: unknown, field: FillField): Fitted {
  const blank = blankOf(field)
  if (raw === null || raw === undefined) return { input: blank }
  const value = asText(coerceInput(raw, field), field)
  // Blank always fits, even a required field, which then shows its message.
  if (field.kindDef.isEmpty(value)) return { input: blank }
  // An async rule can't run here, so its field takes the value unchecked.
  if (isAsync(field.schema)) return { input: value }
  const mismatch = v.safeParse(field.schema, value).issues?.find((issue) => issue.kind === 'schema')
  if (!mismatch) return { input: value }
  const message = `"${field.dotPath}" can't hold ${show(raw)}: ${mismatch.message}`
  return { input: blank, error: new TypeError(message) }
}

/** A number as text, for a field of kind `string` or a list of them, like a zip code sent as one. */
function asText(value: unknown, field: FillField): unknown {
  const text = (item: unknown) =>
    typeof item === 'number' && Number.isFinite(item) ? String(item) : item
  if (field.kind === 'string') return text(value)
  if (field.kind === 'array' && field.itemKind === 'string' && Array.isArray(value)) {
    return value.map(text)
  }
  return value
}

/** The parts of a Valibot schema that hold others. */
interface SchemaParts {
  readonly async?: boolean
  readonly wrapped?: SchemaParts
  readonly pipe?: readonly SchemaParts[]
}

/** True when a part of the schema is async, like a rule that asks a server. */
function isAsync(schema: SchemaParts): boolean {
  if (schema.async) return true
  if (schema.wrapped && isAsync(schema.wrapped)) return true
  return schema.pipe?.some((item) => item !== schema && isAsync(item)) ?? false
}

/** A value for a message, as JSON where it can be. */
export function show(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}
