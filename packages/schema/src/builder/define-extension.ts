import type { SchemaExtension } from '../extensions/schema-extension'
import { fieldGate, rootGate } from '../visibility/gate'
import { clearFields, createVisibility } from '../visibility/visibility'
import { checkExtensions } from './check-extensions'
import { type ExtensionRuntime, RUNTIME } from './extension-runtime'

const runtime: ExtensionRuntime = {
  check: checkExtensions,
  fieldGate,
  rootGate,
  clearFields,
  createVisibility,
}

/**
 * Makes an extension a builder can run: it gives `extension` the code that works out what
 * conditions hide, validates around them and clears fields, which the schema package ships with
 * it, so that a builder without extensions never loads it. `createSchemaBuilder` throws a
 * `TypeError` for an extension that wasn't made with it.
 */
export function defineExtension<TExtension extends SchemaExtension>(
  extension: TExtension,
): TExtension {
  return { ...extension, [RUNTIME]: runtime }
}
