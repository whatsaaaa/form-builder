import type { JsonField } from './json-form-schema'

/** True when the definition makes the field required: `required: true`, or `{ message }`. */
export const isRequired = (field: JsonField): boolean =>
  field.required === true || (typeof field.required === 'object' && field.required !== null)
