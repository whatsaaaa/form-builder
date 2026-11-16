import * as v from 'valibot'

/**
 * Which fields a fill sets: `unedited` only those the user hasn't changed since the last fill, and
 * `always` every one.
 */
export type FillOverwrite = 'unedited' | 'always'

/** A value a map gives a field: one value, a list of them for a multiselect, or null for blank. */
export type FillMapValue = string | number | boolean | null | readonly (string | number | boolean)[]

/**
 * The fill of a field, its trigger: each new value of the trigger sets other fields. With `source`,
 * the values come from a source registered with `fills({ sources })`, for the fields `fields`
 * lists. With `map`, they are written in the definition, for each value of the trigger. Fields are
 * named by their dot path, like `'address.city'`.
 */
export type Fill<TSource extends string = string> =
  | { source: TSource; fields: readonly string[]; overwrite?: FillOverwrite }
  | {
      map: Readonly<Record<string, Readonly<Record<string, FillMapValue>>>>
      overwrite?: FillOverwrite
    }

export const FILL_OVERWRITES = ['unedited', 'always'] as const satisfies readonly FillOverwrite[]

/** The keys a fill takes. */
export const FILL_KEYS = ['source', 'fields', 'map', 'overwrite'] as const

// These schemas type `fills` in `defineForm()`, and make its JSON Schema. `validate()` checks a
// definition with the package's own checks, which give each issue its code and path.

const path = v.pipe(v.string(), v.minLength(1))
// A value of the trigger, as JSON writes it.
const key = v.pipe(v.string(), v.minLength(1))
const scalar = v.union([v.string(), v.number(), v.boolean()])
const mapValue = v.union([scalar, v.null(), v.array(scalar)])
const overwrite = v.optional(v.picklist(FILL_OVERWRITES))

/** The schema of a fill, whose `source` is one of `sources`, or any name without them. */
export function fillSchema<TSource extends string>(
  sources: readonly TSource[] | undefined,
): v.GenericSchema<Fill<TSource>> {
  const source = sources?.length ? v.picklist(sources) : path
  return v.union([
    v.strictObject({ source, fields: v.pipe(v.array(path), v.minLength(1)), overwrite }),
    v.strictObject({
      map: v.pipe(v.record(key, v.record(path, mapValue)), v.minEntries(1)),
      overwrite,
    }),
  ]) as v.GenericSchema<Fill<TSource>>
}

/** The schema of the key the package adds, as `FillsExtension` has it. */
export type FillsPropsSchema<TSource extends string = string> = v.ObjectSchema<
  { readonly fills: v.OptionalSchema<v.LazySchema<v.GenericSchema<Fill<TSource>>>, undefined> },
  undefined
>

/** The key the package adds to fields, for a fill of the schema `fill`. */
export const fillsPropsOf = <TSource extends string>(
  fill: v.GenericSchema<Fill<TSource>>,
): FillsPropsSchema<TSource> => v.object({ fills: v.optional(v.lazy(() => fill)) })
