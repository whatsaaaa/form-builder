import type { DefinitionIssue } from '../errors/definition-error'
import type { SchemaExtension } from '../extensions/schema-extension'
import type { AnySchema } from '../shared/valibot-types'
import type { Engine, UnitValue } from '../visibility/engine'
import type { FieldToClear, Visibility } from '../visibility/visibility'
import type { Built } from './check-extensions'
import type { Registry } from './registry'

/**
 * The code that runs the conditions of extensions, which `defineExtension` attaches to each. The
 * builder reaches it only through its extensions, so an app whose builder has none doesn't bundle
 * it.
 */
export interface ExtensionRuntime {
  /** Runs the extensions' checks. The engine of their conditions, unless they have issues. */
  check(registry: Registry, built: Built, issues: DefinitionIssue[]): Engine | undefined
  fieldGate(schema: AnySchema, role: UnitValue['role']): AnySchema
  rootGate<TSchema extends AnySchema>(schema: TSchema, engine: Engine): TSchema
  clearFields<T>(input: T, toClear: readonly FieldToClear[]): T
  createVisibility(engine: Engine | undefined): Visibility
}

/** Where an extension made by `defineExtension` holds the runtime. */
export const RUNTIME = Symbol('form-builder extension runtime')

/** The runtime an extension holds, if it was made by `defineExtension`. */
export const runtimeOf = (extension: SchemaExtension | undefined): ExtensionRuntime | undefined =>
  (extension as { [RUNTIME]?: ExtensionRuntime } | undefined)?.[RUNTIME]
