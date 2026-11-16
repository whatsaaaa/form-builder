import type { DefinitionPath } from '../errors/definition-error'
import type { TargetFill } from '../extensions/schema-extension'
import type { KindDef } from '../kinds/kind-def'
import type { AnySchema } from '../shared/valibot-types'
import type { ValueKind } from '../shared/value-kind'

/** The fills of a definition without issues, as the builder checked them, for its `Fills`. */
export interface FillPlan {
  /** Each fill, in the order they run: a fill after any fill that sets its trigger. */
  readonly fills: readonly PlannedFill[]
  /** The trigger of each fill once, in document order. */
  readonly triggers: readonly FillField[]
}

export interface PlannedFill {
  readonly trigger: FillField
  /** The fields it sets, in the order the extension gave them. */
  readonly fields: readonly FillField[]
  readonly target: TargetFill
}

/**
 * A field with a value outside a list's items, as fills read and set it. Each field has one, which
 * every fill that reads or sets it shares.
 */
export interface FillField {
  /** Its Formisch path, like `['address', 'city']`. */
  readonly path: readonly string[]
  /** `'address.city'`. */
  readonly dotPath: string
  readonly definitionPath: DefinitionPath
  readonly kind: ValueKind
  readonly itemKind: ValueKind | undefined
  readonly kindDef: KindDef
  /** Its schema, without any condition. */
  readonly schema: AnySchema
}
