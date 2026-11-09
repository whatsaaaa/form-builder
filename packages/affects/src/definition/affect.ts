import * as v from 'valibot'

/**
 * What an affect does while its condition is met: `hide` hides the field and keeps its value,
 * `hideAndClear` hides it and clears its value, and `show` shows it only then. Hide always wins.
 */
export type Effect = 'show' | 'hide' | 'hideAndClear'

/** The value an operator compares with. */
export type Scalar = string | number | boolean

/**
 * When an affect applies: a test of one field, by its dot path, with one operator, or every
 * (`all`) or any (`any`) of a list of conditions.
 */
export type Condition =
  | { field: string; equals: Scalar }
  | { field: string; notEquals: Scalar }
  | { field: string; in: readonly Scalar[] }
  | { field: string; includes: Scalar }
  | { field: string; empty: true }
  | { field: string; notEmpty: true }
  | { all: readonly Condition[] }
  | { any: readonly Condition[] }

/** One effect of a field, step or section, and when it applies. */
export interface Affect {
  effect: Effect
  when: Condition
}

/** The operators of a test, each with the value it takes. */
export const OPERATORS = ['equals', 'notEquals', 'in', 'includes', 'empty', 'notEmpty'] as const

export type Operator = (typeof OPERATORS)[number]

export const EFFECTS = ['show', 'hide', 'hideAndClear'] as const satisfies readonly Effect[]

// These schemas type `affects` in `defineForm()`, and make its JSON Schema. `validate()` checks a
// definition with the package's own checks, which give each issue its code and path.

const path = v.pipe(v.string(), v.minLength(1))
const scalar = v.union([v.string(), v.number(), v.boolean()])
const conditions = v.pipe(v.array(v.lazy(() => condition)), v.minLength(1))

export const condition: v.GenericSchema<Condition> = v.union([
  v.strictObject({ field: path, equals: scalar }),
  v.strictObject({ field: path, notEquals: scalar }),
  v.strictObject({ field: path, in: v.pipe(v.array(scalar), v.minLength(1)) }),
  v.strictObject({ field: path, includes: scalar }),
  v.strictObject({ field: path, empty: v.literal(true) }),
  v.strictObject({ field: path, notEmpty: v.literal(true) }),
  v.strictObject({ all: conditions }),
  v.strictObject({ any: conditions }),
])

export const affect: v.GenericSchema<Affect> = v.strictObject({
  effect: v.picklist(EFFECTS),
  when: v.lazy(() => condition),
})

/** The key the package adds to fields, steps and sections. */
export const affectsProps = v.object({
  affects: v.optional(v.array(v.lazy(() => affect))),
})
