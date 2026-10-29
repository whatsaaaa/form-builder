import type * as v from 'valibot'
import type { AnyObjectSchema, AnySchema } from '../shared/valibot-types'
import type { ValueKind } from '../shared/value-kind'
import type { JsonField, JsonRule } from '../definition/json-form-schema'
import type { DefinitionPath } from '../errors/definition-error'

export interface FieldTypeDef<TProps extends AnyObjectSchema = AnyObjectSchema> {
  kind: ValueKind
  /** Extra keys this type accepts on a field, e.g. `options` on a select. */
  props?: TProps
  /**
   * The base schema for the field's value. Required unless `kind` is `'none'`.
   * Method syntax keeps it bivariant, so typed field types fit in a `Record<string, FieldTypeDef>`.
   */
  schema?(field: FieldWithProps<TProps>, ctx: BuildContext): AnySchema
  /** Rules every field of this type gets. A field rule with the same name replaces one. */
  defaultRules?: readonly JsonRule[]
}

/** A field with its type's props parsed and typed. */
export type FieldWithProps<TProps extends AnyObjectSchema = AnyObjectSchema> = JsonField &
  v.InferOutput<TProps>

export interface BuildContext {
  /** Where the field is in the definition, e.g. `['fields', 2]`. */
  readonly path: DefinitionPath
}
