import type { AnyObjectSchema } from '../shared/valibot-types'
import type { RuleDef } from './rule-def'

export const defineRule = <T extends AnyObjectSchema>(def: RuleDef<T>): RuleDef<T> => def
