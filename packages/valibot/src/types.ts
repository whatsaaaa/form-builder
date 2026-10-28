import type * as v from 'valibot'

export type AnySchema = v.GenericSchema
export type AnyAction = v.GenericPipeAction
export type ValueKind = 'string' | 'number'
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

export interface RuleDef<TParams extends AnySchema = AnySchema> {
  kinds: readonly ValueKind[]
  params: TParams
  // Method syntax keeps `create` bivariant, so specific rules fit in a `Record<string, RuleDef>`.
  create(params: v.InferOutput<TParams>, message?: string): AnyAction
}

export interface FieldTypeDef {
  kind: ValueKind
  base: (message?: string) => AnySchema
  defaultRules?: readonly JsonRule[]
}
