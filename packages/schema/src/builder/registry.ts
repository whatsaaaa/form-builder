import type { FieldTypeDef } from '../field-types/field-type-def'
import type { RuleDef } from '../rules/rule-def'

export interface Registry {
  fieldTypes: Record<string, FieldTypeDef>
  rules: Record<string, RuleDef>
}
