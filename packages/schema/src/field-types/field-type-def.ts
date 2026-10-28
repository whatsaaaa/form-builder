import type { JsonRule } from '../definition/json-form-schema'
import type { AnySchema } from '../shared/valibot-types'
import type { ValueKind } from '../shared/value-kind'

export interface FieldTypeDef {
  kind: ValueKind
  base: (message?: string) => AnySchema
  defaultRules?: readonly JsonRule[]
}
