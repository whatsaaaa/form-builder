// Public API. Everything a consumer can import is exported here and nowhere else.
import { defineExtension, type SchemaExtension } from '@whatsaaaa/form-builder-schema'
import { checkAffects } from './check/check-affects'
import { affect, affectsProps, condition } from './definition/affect'

export type { Affect, Condition, Effect, Scalar } from './definition/affect'

/** The extension `affects()` gives, with the type of the key it adds, for `defineForm()`. */
export interface AffectsExtension extends SchemaExtension {
  readonly fieldProps: typeof affectsProps
  readonly layoutProps: typeof affectsProps
}

/**
 * Conditions on fields, steps and sections: `affects`, a list of effects (`show`, `hide`,
 * `hideAndClear`), each with the condition that applies it. Pass it to the schema builder:
 * `createSchemaBuilder({ extensions: [affects()] })`. The schema it builds skips the validation of
 * hidden fields, and the builder's `getVisibility()` tells renderers what to hide and to clear.
 */
export function affects(): AffectsExtension {
  return defineExtension({
    name: 'affects',
    fieldProps: affectsProps,
    layoutProps: affectsProps,
    definitions: { affect, condition },
    check: checkAffects,
  })
}
