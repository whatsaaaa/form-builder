import { DISPLAY_TYPES } from './built-in-types'
import type { JsonField, JsonForm } from './json-form-schema'

const displayTypes: ReadonlySet<string> = new Set(DISPLAY_TYPES)

/**
 * Formisch's `initialInput` for a definition: each field's `default`, nested the way the value
 * is. A group gives an object, and an array without a default gives `[]`. Other fields without
 * a default, and display elements, are left out. Like `walkFields`, it reads the built-in types
 * and needs no builder. For your own container types, use the builder's `getInitialInput`.
 */
export function getInitialInput(definition: JsonForm): Record<string, unknown> {
  return inputOf(definition.fields)
}

function inputOf(fields: readonly JsonField[]): Record<string, unknown> {
  const input: Record<string, unknown> = {}
  for (const field of fields) {
    if (field.name === undefined || displayTypes.has(field.type)) continue
    const value = initialValue(field)
    if (value !== undefined) input[field.name] = value
  }
  return input
}

function initialValue(field: JsonField): unknown {
  if (field.type === 'group') return inputOf(Array.isArray(field.fields) ? field.fields : [])
  if (field.type === 'array') return field.default ?? []
  return field.default
}
