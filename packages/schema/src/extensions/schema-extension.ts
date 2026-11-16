import type { WalkedField } from '../definition/walked-field'
import type { DefinitionIssueCode, DefinitionPath } from '../errors/definition-error'
import type { KindDef } from '../kinds/kind-def'
import type { WebAbortSignal } from '../shared/web-globals'
import type { AnyObjectSchema, AnySchema } from '../shared/valibot-types'
import type { ValueKind } from '../shared/value-kind'

/**
 * A feature from another package that reads keys of its own on fields, and on the layout's steps
 * and sections, like the `affects` of `@whatsaaaa/form-builder-affects`. Pass it to
 * `createSchemaBuilder({ extensions: [...] })`. Without it, its keys are unknown keys.
 *
 * How the contract can grow in a minor version, so an extension written today keeps working:
 * - The interfaces here can get new optional members. An extension never has to set one.
 * - `ExtensionTarget` can get new kinds of target, for new places in a definition. Skip the kinds
 *   you don't know: never throw on them, or treat them as a field.
 * - `TargetConditions` and the result of its `evaluate()` can get new optional members, for new
 *   effects. Leaving them out keeps today's meaning.
 * - `ExtensionContext` can get new members, and `issue()` new codes.
 *
 * Removing or renaming a member, making one required, or changing what one means, only happens
 * in a major version.
 */
export interface SchemaExtension {
  /** Names the extension in messages, e.g. `'affects'`. */
  readonly name: string
  /**
   * The keys it adds to every field, and to every display element written in a layout. Their names
   * can't be reserved keys or the props of a field type. `check()` checks their values, and
   * `toJsonSchema()` and `defineForm()` read their types from this schema.
   */
  readonly fieldProps?: AnyObjectSchema
  /** The keys it adds to the layout's steps and sections, the same way. */
  readonly layoutProps?: AnyObjectSchema
  /**
   * Named schemas its props refer to, for `toJsonSchema()`: each is written once, and a `v.lazy()`
   * that returns one becomes a reference to it, e.g. for a condition that holds conditions.
   */
  readonly definitions?: Readonly<Record<string, AnySchema>>
  /**
   * Checks its keys once the fields, form rules and layout are checked, and adds their issues
   * with `ctx.issue()`. Returns the conditions of each target that has some: what they read, and
   * whether they hide or clear it for an input. Adds the fills of a field with `ctx.fill()`.
   */
  check(ctx: ExtensionContext): ReadonlyMap<ExtensionTarget, TargetConditions>
}

/**
 * Something an extension's keys can be on: a field in `fields`, display elements included, or a
 * step, a section, or a display element written in the layout. The layout's are only there when
 * the layout and the fields have no issues of their own.
 */
export type ExtensionTarget = FieldTarget | LayoutTarget

export interface FieldTarget {
  readonly kind: 'field'
  /** The field as the builder's `walkFields` gives it. */
  readonly field: WalkedField
  /** The field as written, with the extension's keys. */
  readonly json: Readonly<Record<string, unknown>>
  readonly definitionPath: DefinitionPath
}

export interface LayoutTarget {
  readonly kind: 'step' | 'section' | 'display'
  /** The step, section or display element as written, with the extension's keys. */
  readonly json: Readonly<Record<string, unknown>>
  readonly definitionPath: DefinitionPath
  /**
   * Where the values of the fields around it are: `[]`, or `['lines', '*']` in the layout of an
   * array's items, whose fields it reads with `'lines.*.kind'`.
   */
  readonly dataPath: readonly (string | number)[]
}

export interface ExtensionContext {
  /** Every field, and every step, section and display element of the layout, in document order. */
  readonly targets: readonly ExtensionTarget[]
  /**
   * The field with a value at a dot path, read from `from`, the way form rules find the fields
   * they read: `'address.city'`, or `'lines.*.kind'` from the same item of `lines`. A message when
   * there is none, and null when the field has issues of its own, which are reported already.
   */
  resolve(dotPath: string, from: ExtensionTarget): ResolvedField | string | null
  /** Adds an issue to the definition's. */
  issue(code: DefinitionIssueCode, path: DefinitionPath, message: string): void
  /**
   * Adds a fill: while a form is open, each new value of the field `trigger` sets the fields of
   * `fill`. Add only fills without issues. The builder keeps them when the whole definition has
   * none, reports fills that set each other in a loop as `cycle`, and runs them through
   * `getFills()`. Throws a TypeError for a fill no form can run: a trigger without a string,
   * number, boolean or date value, a field to set that is no field with a value, or is a file,
   * either inside a list's items, or a field to set twice.
   */
  fill(trigger: FieldTarget, fill: TargetFill): void
}

/** A field with a value that a condition reads. */
export interface ResolvedField {
  readonly field: WalkedField
  /** The kind of its value, e.g. `'string'`, and the kind's own checks. */
  readonly kind: ValueKind
  readonly kindDef: KindDef
  /** Its schema, without any condition: the values it accepts. */
  readonly schema: AnySchema
  /**
   * For a field of kind `array` whose items have a value of their own, like a multiselect or a
   * list of single values: the kind and schema of each item.
   */
  readonly item: { readonly kind: ValueKind; readonly schema: AnySchema } | undefined
  /**
   * How a renderer shows it: a field with a value, or a container of kind `object` or `array`.
   * This builder always sets it.
   */
  readonly role?: 'value' | 'group' | 'array'
}

/** The conditions on one target. */
export interface TargetConditions {
  /** The fields they read, and where each is read in the definition, for the cycle check. */
  readonly reads: readonly { readonly field: ResolvedField; readonly at: DefinitionPath }[]
  /**
   * Whether they hide the target for one input, and clear its value too. `read(i)` is the input
   * of `reads[i]` as the form holds it, at the same item as the target, or undefined while that
   * field is hidden.
   */
  evaluate(read: (i: number) => unknown): { readonly hidden: boolean; readonly clear: boolean }
}

/** What the fill of one field sets, as an extension adds it with `ctx.fill()`. */
export interface TargetFill {
  /** The fields it sets, found with `ctx.resolve()`, and where each is named in the definition. */
  readonly fields: readonly { readonly field: ResolvedField; readonly at: DefinitionPath }[]
  /** `'unedited'` leaves a field the user changed since the last fill. `'always'` sets it anyway. */
  readonly overwrite: 'unedited' | 'always'
  /**
   * True when `values()` gives the same values for the same value at once, from the definition,
   * like a map written in it. A form then starts with the values for its trigger's default.
   */
  readonly static: boolean
  /**
   * The values of the fields for a value of the trigger, by the dot path of each field, or a
   * promise of them. Called only with a value: an empty trigger runs no fill.
   */
  values(value: FillTriggerValue, ctx: FillContext): FillResult | PromiseLike<FillResult>
}

/** The value of a fill's trigger, as `coerceInput` reads it: a date is its ISO string. */
export type FillTriggerValue = string | number | boolean

/**
 * The values a fill sets, by the dot path of each field, like `{ 'address.city': 'Beograd' }`.
 * Null or undefined set no values, so every field of the fill is blank.
 */
export type FillResult = Readonly<Record<string, unknown>> | null | undefined

/** What a fill's `values()` gets with the value of its trigger. */
export interface FillContext {
  /**
   * Aborted when the trigger gets another value or is cleared, or the form closes, e.g. to pass
   * to `fetch()`. It is the runtime's `AbortSignal`.
   */
  readonly signal: WebAbortSignal
  /** The form's input when the fill started. */
  readonly input: Readonly<Record<string, unknown>>
}
