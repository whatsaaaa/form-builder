export interface JsonForm {
  version: '1'
  fields: readonly JsonField[]
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
  /** Validated by the field type's props schema, */
  [prop: string]: unknown
}

export interface JsonRule {
  rule: string
  message?: string
  [param: string]: unknown
}
