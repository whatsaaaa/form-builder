export type FieldType = 'text' | 'email' | 'password' | 'number'

export interface JsonField {
  name: string
  type: FieldType
  required?: boolean | { message?: string }
  rules?: readonly JsonRule[]
}

export interface JsonRule {
  rule: string
  message?: string
  [param: string]: unknown
}

export interface JsonFormSchema {
  version: '1'
  fields: readonly JsonField[]
}
