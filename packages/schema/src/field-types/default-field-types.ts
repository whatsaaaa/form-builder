import { basicTypes } from './basic-types'
import type { FieldTypeDef } from './field-type-def'

/** Every built-in field type. */
export const defaultFieldTypes = {
  ...basicTypes,
} satisfies Record<string, FieldTypeDef>
