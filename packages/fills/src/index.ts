// Public API. Everything a consumer can import is exported here and nowhere else.
import type { SchemaExtension } from '@whatsaaaa/form-builder-schema'
import { checkFills } from './check/check-fills'
import { fillSchema, fillsPropsOf, type FillsPropsSchema } from './definition/fill'
import type { FillSource } from './values/values'

export type { Fill, FillMapValue, FillOverwrite, FillsPropsSchema } from './definition/fill'
export type { FillSource, FillSourceContext, FillValues } from './values/values'

/**
 * The extension `fills()` gives, with the type of the key it adds, for `defineForm()`. `TSource`
 * is the name of each source it was given, or any string without them.
 */
export interface FillsExtension<TSource extends string = string> extends SchemaExtension {
  readonly fieldProps: FillsPropsSchema<TSource>
}

export interface FillsOptions<TSources extends Readonly<Record<string, FillSource>>> {
  /**
   * The sources a fill can name, by name. With them, `validate()` reports a name that isn't here
   * as `unknown_source`. Without them, names aren't checked, e.g. on a server that only
   * validates, and a form that runs a fill with a source reports a TypeError.
   */
  readonly sources?: TSources
}

/** The name of each source, or any string without them. */
type SourceName<TSources> = [keyof TSources] extends [never] ? string : keyof TSources & string

/**
 * Fills on fields: `fills`, which sets other fields from each new value of the field it is on,
 * with values from a `map` in the definition, or from a `source` of yours. Pass it to the schema
 * builder: `createSchemaBuilder({ extensions: [fills({ sources: { profiles } })] })`. The builder's
 * `getFills()` runs them in a form. Throws a TypeError for a source that is no function.
 */
export function fills<
  const TSources extends Readonly<Record<string, FillSource>> = Record<never, never>,
>(options: FillsOptions<TSources> = {}): FillsExtension<SourceName<TSources>> {
  const { sources } = options
  for (const [name, source] of Object.entries(sources ?? {})) {
    if (typeof source !== 'function') {
      throw new TypeError(
        `fills(): the source "${name}" is a function, like (value, { signal }) => ({ firstName: 'Marko' })`,
      )
    }
  }
  const fill = fillSchema(sources && (Object.keys(sources) as SourceName<TSources>[]))
  return {
    name: 'fills',
    fieldProps: fillsPropsOf(fill),
    definitions: { fill },
    check: checkFills(sources),
  }
}
