import type { JsonLayout } from './json-layout'

export interface JsonForm {
  /** Where the definition's JSON Schema is, for editors. This package never reads it. */
  $schema?: string
  version: '1'
  fields: readonly JsonField[]
  /** Rules that check a field against other fields. They run after every field's own rules. */
  formRules?: readonly JsonFormRule[]
  /** Where the fields go, on one page or in steps. Without it, the order of `fields`. */
  layout?: JsonLayout
}

export interface JsonField {
  name?: string
  type: string
  label?: string
  description?: string
  placeholder?: string
  default?: unknown
  required?: boolean | { message?: string }
  rules?: readonly JsonRule[]
  /** For renderers. This package never reads or checks it. */
  ui?: Record<string, unknown>
  /** Validated by the field type's props schema. */
  [prop: string]: unknown
}

export interface JsonRule {
  rule: string
  message?: string
  [param: string]: unknown
}

export interface JsonFormRule {
  rule: string
  /** Where the error shows, as a dot path: `'password2'`, `'address.zip'` or `'lines.*.qty'`. */
  field: string
  /**
   * Required, unlike a field rule's. Without it, the error would be Valibot's generic "Invalid
   * input", which says nothing about the other field and repeats what was typed.
   */
  message: string
  [param: string]: unknown
}
