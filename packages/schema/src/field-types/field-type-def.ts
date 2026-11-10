import type * as v from 'valibot'
import type { AnyAction, AnyObjectSchema, AnySchema } from '../shared/valibot-types'
import type { ValueKind } from '../shared/value-kind'
import type { JsonField, JsonRule } from '../definition/json-form'
import type { DefinitionPath } from '../errors/definition-error'

export interface FieldTypeDef<TProps extends AnyObjectSchema = AnyObjectSchema> {
  /**
   * The kind of the field's value. A function gets the field with its props parsed, for types
   * whose value depends on them: a select with number options has kind `'number'`.
   */
  kind: ValueKind | KindOf<TProps>
  /**
   * The kind of each item when the field's kind is `'array'`. A rule that supports this kind but
   * not `'array'` then runs once per item, so `maxSize` works on a multi-file field.
   */
  itemKind?: ValueKind | KindOf<TProps>
  /** Extra keys this type accepts on a field, e.g. `options` on a select. */
  props?: TProps
  /**
   * The base schema for the field's value. Required unless `kind` is `'none'`.
   * Method syntax keeps it bivariant, so typed field types fit in a `Record<string, FieldTypeDef>`.
   */
  schema?(field: FieldWithProps<TProps>, ctx: BuildContext): AnySchema
  /** Rules every field of this type gets. A field rule with the same name replaces one. */
  defaultRules?: readonly JsonRule[]
  /**
   * Replaces the kind's required check. A required yes/no radio has kind `'boolean'`, but must
   * accept `false`, so its type returns null here.
   */
  required?(message: string): AnyAction | null
  /** Runs last, after every rule, e.g. to turn an ISO string into a `Date`. */
  finalize?(field: FieldWithProps<TProps>): AnyAction | undefined
  /**
   * True for a type whose value holds other fields, built with `ctx.buildFields` or
   * `ctx.buildField`. Its kind must be `'object'` or `'array'`. The value is never empty: a
   * missing one becomes `{}` or `[]`, and the rules always run. Formisch then sees the object or
   * array schema itself, so it keeps a field for each child.
   */
  container?: boolean
  meta?: FieldTypeMeta
}

/** Describes a field type to people, e.g. in the builder app's type picker and the docs. */
export interface FieldTypeMeta {
  label: string
  description?: string
}

/**
 * Picks the kind from the field, for a `kind` or `itemKind` that depends on the props. Declared as
 * a method so it stays bivariant, like `schema()`.
 */
export type KindOf<TProps extends AnyObjectSchema = AnyObjectSchema> = {
  bivariant(field: FieldWithProps<TProps>): ValueKind
}['bivariant']

/** A field with its type's props parsed and typed. */
export type FieldWithProps<TProps extends AnyObjectSchema = AnyObjectSchema> = JsonField &
  v.InferOutput<TProps>

export interface BuildContext {
  /** Where the field is in the definition, e.g. `['fields', 2]`. */
  readonly path: DefinitionPath
  /**
   * Checks and builds child fields with the same registries, and returns their object schema.
   * Their issues land in the same `validate()` result. `path` is where the list is in the
   * definition, e.g. `[...ctx.path, 'fields']`.
   */
  buildFields(fields: readonly JsonField[], path: DefinitionPath): AnyObjectSchema
  /** Checks and builds one field for the items of a list. Its name isn't needed or used. */
  buildField(field: JsonField, path: DefinitionPath): AnySchema
}
