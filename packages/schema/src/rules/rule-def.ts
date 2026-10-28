import type * as v from 'valibot'
import type { AnyAction, AnySchema } from '../shared/valibot-types'
import type { ValueKind } from '../shared/value-kind'

export interface RuleDef<TParams extends AnySchema = AnySchema> {
  kinds: readonly ValueKind[]
  params: TParams
  // Method syntax keeps `create` bivariant, so specific rules fit in a `Record<string, RuleDef>`.
  create(params: v.InferOutput<TParams>, message?: string): AnyAction
}
