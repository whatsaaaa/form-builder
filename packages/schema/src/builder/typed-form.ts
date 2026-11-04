import type * as v from 'valibot'
import type { JsonField } from '../definition/json-form-schema'
import type { FieldTypeDef } from '../field-types/field-type-def'
import type { FormRuleDef } from '../rules/form-rule-def'
import type { RuleDef } from '../rules/rule-def'

// Types for writing a definition in TypeScript against one builder's registries. They only exist
// at compile time: validate() still checks everything they can't, like duplicate names.

/** Turns an intersection into one object type, so editors show it whole. */
type Simplify<T> = { [K in keyof T]: T[K] } & {}

/** No keys. */
type None = Record<never, never>

/** The input of a props or params schema. The generic object schema takes any key, so none. */
type InputOf<T> = T extends v.GenericSchema
  ? string extends keyof v.InferInput<T>
    ? None
    : v.InferInput<T>
  : None

/** A params function's schema, or the schema itself. */
type Unwrap<T> = T extends (...args: never[]) => infer R ? R : T

type PropsOf<T> = T extends { props?: infer P } ? InputOf<P> : None
type ParamsOf<T> = T extends { params?: infer P } ? InputOf<Unwrap<P>> : None

/**
 * Child fields in a type's props, like a group's `fields`, are typed fields too. The list is an
 * interface, so TypeScript resolves it only when it checks a child, not while it builds the union.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface TypedFieldList<
  TFieldTypes extends Record<string, FieldTypeDef>,
  TRules extends Record<string, RuleDef>,
> extends ReadonlyArray<TypedField<TFieldTypes, TRules>> {}

type Child<
  T,
  TFieldTypes extends Record<string, FieldTypeDef>,
  TRules extends Record<string, RuleDef>,
> = T extends readonly JsonField[]
  ? TypedFieldList<TFieldTypes, TRules>
  : T extends JsonField
    ? TypedFieldList<TFieldTypes, TRules>[number]
    : T

type WithChildren<
  T,
  TFieldTypes extends Record<string, FieldTypeDef>,
  TRules extends Record<string, RuleDef>,
> = { [K in keyof T]: Child<T[K], TFieldTypes, TRules> }

/** A rule on a field: a registered name, its params, and an optional message. */
export type TypedRule<TRules extends Record<string, RuleDef>> = {
  [K in keyof TRules & string]: Simplify<{ rule: K; message?: string } & ParamsOf<TRules[K]>>
}[keyof TRules & string]

/** A form rule: a registered name, the field its error shows on, its params and a message. */
export type TypedFormRule<TFormRules extends Record<string, FormRuleDef>> = {
  [K in keyof TFormRules & string]: Simplify<
    { rule: K; field: string; message: string } & ParamsOf<TFormRules[K]>
  >
}[keyof TFormRules & string]

/** A field of a registered type, with that type's props. */
export type TypedField<
  TFieldTypes extends Record<string, FieldTypeDef>,
  TRules extends Record<string, RuleDef>,
> = {
  [K in keyof TFieldTypes & string]: FieldKeys<K, TRules> &
    WithChildren<PropsOf<TFieldTypes[K]>, TFieldTypes, TRules>
}[keyof TFieldTypes & string]

/** The keys every field has. */
type FieldKeys<TType extends string, TRules extends Record<string, RuleDef>> = {
  name?: string
  type: TType
  label?: string
  description?: string
  placeholder?: string
  default?: unknown
  required?: boolean | { message?: string }
  rules?: readonly TypedRule<TRules>[]
  ui?: Record<string, unknown>
}

/** A definition written against one builder's registries. It is also a `JsonForm`. */
export type TypedForm<
  TFieldTypes extends Record<string, FieldTypeDef>,
  TRules extends Record<string, RuleDef>,
  TFormRules extends Record<string, FormRuleDef>,
> = {
  $schema?: string
  version: '1'
  fields: readonly TypedField<TFieldTypes, TRules>[]
  formRules?: readonly TypedFormRule<TFormRules>[]
}
