import type * as v from 'valibot'
import type { AnyObjectSchema } from '../shared/valibot-types'
import type { ValueKind } from '../shared/value-kind'
import type { RuleMeta } from './rule-def'

/**
 * A rule that checks a field against other fields, e.g. that two passwords match. It goes in the
 * definition's `formRules`, and its error shows on the field named by `field`.
 */
export interface FormRuleDef<TParams extends AnyObjectSchema = AnyObjectSchema> {
  /** Its params, next to `rule`, `field` and `message` in the definition. Unknown ones fail. */
  params?: TParams
  /**
   * The paths the rule reads besides `field`, e.g. `[params.other]`, so the builder can check
   * that those fields exist. Method syntax keeps it bivariant, like `check()`.
   */
  reads(params: v.InferOutput<TParams>): readonly string[]
  /** The kinds the fields it reads may have. Any kind when omitted. */
  kinds?: readonly ValueKind[]
  /** True when every field it reads must have the same kind, e.g. to compare them. */
  sameKind?: boolean
  /**
   * True when the values pass. `values` holds the value of `field`, then the values of the paths
   * from `reads()`, in that order. It only runs when all of them are valid and none is empty.
   */
  check(values: readonly unknown[], params: v.InferOutput<TParams>): boolean
  meta?: RuleMeta
}
