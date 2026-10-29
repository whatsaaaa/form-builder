import type { AnyObjectSchema } from '../shared/valibot-types'
import type { FieldTypeDef } from './field-type-def'

export const defineFieldType = <T extends AnyObjectSchema>(def: FieldTypeDef<T>): FieldTypeDef<T> =>
  def
