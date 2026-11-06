import type { JsonField } from '@whatsaaaa/form-builder-schema'

export interface Option {
  value: string | number | boolean
  label: string
}

/** The options of a select, radio or multiselect field. A select without them loads them later. */
export const optionsOf = (field: JsonField): Option[] =>
  Array.isArray(field.options) ? (field.options as Option[]) : []
