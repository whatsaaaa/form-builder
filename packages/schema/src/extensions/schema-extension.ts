import type { WalkedField } from '../definition/walk-fields'
import type { DefinitionIssueCode, DefinitionPath } from '../errors/definition-error'
import type { KindDef } from '../kinds/kind-def'
import type { AnyObjectSchema, AnySchema } from '../shared/valibot-types'
import type { ValueKind } from '../shared/value-kind'

/**
 * A feature from another package that reads keys of its own on fields, and on the layout's steps
 * and sections, like the `affects` of `@whatsaaaa/form-builder-affects`. Pass it to
 * `createSchemaBuilder({ extensions: [...] })`. Without it, its keys are unknown keys.
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
   * whether they hide or clear it for an input.
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
