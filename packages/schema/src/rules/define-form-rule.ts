import type { AnyObjectSchema } from '../shared/valibot-types'
import type { FormRuleDef } from './form-rule-def'

export const defineFormRule = <T extends AnyObjectSchema>(def: FormRuleDef<T>): FormRuleDef<T> =>
  def
