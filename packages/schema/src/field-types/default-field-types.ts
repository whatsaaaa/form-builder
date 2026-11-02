import { basicTypes } from './basic-types'
import { choiceTypes } from './choice-types'
import { dateTypes } from './date-types'
import type { FieldTypeDef } from './field-type-def'

/** Every built-in field type. */
export const defaultFieldTypes = {
  ...basicTypes,
  ...dateTypes,
  ...choiceTypes,
} satisfies Record<string, FieldTypeDef>
