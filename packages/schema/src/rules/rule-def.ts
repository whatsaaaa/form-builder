import type * as v from 'valibot'
import type { AnyAction, AnyObjectSchema } from '../shared/valibot-types'
import type { ValueKind } from '../shared/value-kind'

/**
 * `normalize` rules (trim, change case) run before the required check, so `'    '` with `trim` counts
 * as empty. `validate` rules run after it.
 */
export type RuleStage = 'normalize' | 'validate'

/** Groups rules in the builder app. One per rule family. */
export type RuleCategory =
  | 'length'
  | 'text'
  | 'content'
  | 'format'
  | 'date'
  | 'comparison'
  | 'number'
  | 'file'
  | 'normalize'

/** Describes a rule to people, e.g. in the builder app's rule picker. */
export interface RuleMeta {
  label: string
  description?: string
  category: RuleCategory
}

export interface RuleDef<TParams extends AnyObjectSchema = AnyObjectSchema> {
  kinds: readonly ValueKind[]
  /** Defaults to `'validate'`. */
  stage?: RuleStage
  /** The params the rule takes. Omit it for rules without params. Unknown params are rejected. */
  params?: TParams
  meta?: RuleMeta
  /** Method syntax keeps `create` bivariant, so specific rules fit in a `Record<string, RuleDef>`. */
  create(params: v.InferOutput<TParams>, message?: string): AnyAction
}
