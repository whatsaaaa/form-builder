import { basicTypes } from './basic-types'
import { choiceTypes } from './choice-types'
import { containerTypes } from './container-types'
import { dateTypes } from './date-types'
import { displayTypes } from './display-types'
import { fileType } from './file-type'
import type { FieldTypeDef } from './field-type-def'

/** Every built-in field type. */
export const defaultFieldTypes = {
  ...basicTypes,
  ...dateTypes,
  ...choiceTypes,
  file: fileType,
  ...displayTypes,
  ...containerTypes,
} satisfies Record<string, FieldTypeDef>
