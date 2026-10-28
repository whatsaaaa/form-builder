import type { AnySchema } from '../shared/valibot-types'
import type { RuleDef } from './rule-def'

export const defineRule = <T extends AnySchema>(def: RuleDef<T>): RuleDef<T> => def
