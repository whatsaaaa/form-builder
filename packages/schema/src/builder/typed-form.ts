import type * as v from 'valibot'
import type { JsonField } from '../definition/json-form'
import type { FieldTypeDef } from '../field-types/field-type-def'
import type { FormRuleDef } from '../rules/form-rule-def'
import type { RuleDef } from '../rules/rule-def'
import type { RESERVED_LAYOUT_TYPES } from '../shared/reserved-keys'

// Types for writing a definition in TypeScript against one builder's registries. They only exist
// at compile time: validate() still checks everything they can't, like duplicate names.

/** Turns an intersection into one object type, so editors show it whole. */
type Simplify<T> = { [K in keyof T]: T[K] } & {}

/** No keys. */
type None = Record<never, never>

/**
 * The keys a builder's extensions add: to every field and display element of a layout, and to the
 * layout's steps and sections. Their types are the input types of the extensions' props schemas.
 */
export interface ExtensionProps {
  field: object
  layout: object
}

/** The keys of a builder without extensions. */
export type NoExtensionProps = { field: None; layout: None }

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
  TFieldProps extends object = None,
> extends ReadonlyArray<TypedField<TFieldTypes, TRules, TFieldProps>> {}

type Child<
  T,
  TFieldTypes extends Record<string, FieldTypeDef>,
  TRules extends Record<string, RuleDef>,
  TFieldProps extends object,
> = T extends readonly JsonField[]
  ? TypedFieldList<TFieldTypes, TRules, TFieldProps>
  : T extends JsonField
    ? TypedFieldList<TFieldTypes, TRules, TFieldProps>[number]
    : T

type WithChildren<
  T,
  TFieldTypes extends Record<string, FieldTypeDef>,
  TRules extends Record<string, RuleDef>,
  TFieldProps extends object,
> = { [K in keyof T]: Child<T[K], TFieldTypes, TRules, TFieldProps> }

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

/** A field of a registered type, with that type's props, and the keys extensions add. */
export type TypedField<
  TFieldTypes extends Record<string, FieldTypeDef>,
  TRules extends Record<string, RuleDef>,
  TFieldProps extends object = None,
> = {
  [K in keyof TFieldTypes & string]: FieldKeys<K, TRules> &
    TFieldProps &
    WithChildren<PropsOf<TFieldTypes[K]>, TFieldTypes, TRules, TFieldProps>
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

/** A layout's `ui`, and that of its steps, sections and rows. */
type Ui = Record<string, unknown>

/** A list of layout items. An interface, so the items can hold lists of their own. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface TypedLayoutList<
  TFieldTypes extends Record<string, FieldTypeDef>,
  TExtensionProps extends ExtensionProps = NoExtensionProps,
> extends ReadonlyArray<TypedLayoutItem<TFieldTypes, TExtensionProps>> {}

/**
 * A display element written in a layout: a registered type, with its props, and an `id` instead of
 * a `name`. Types with a value fit too, as TypeScript can't tell them apart: `validate()` rejects
 * them.
 */
type TypedLayoutDisplay<
  TFieldTypes extends Record<string, FieldTypeDef>,
  TFieldProps extends object,
> = {
  [K in Exclude<keyof TFieldTypes & string, (typeof RESERVED_LAYOUT_TYPES)[number]>]: Simplify<
    {
      type: K
      id?: string
      label?: string
      description?: string
      placeholder?: string
      ui?: Ui
      span?: number
    } & TFieldProps &
      PropsOf<TFieldTypes[K]>
  >
}[Exclude<keyof TFieldTypes & string, (typeof RESERVED_LAYOUT_TYPES)[number]>]

/**
 * One item of a layout, with display elements typed by their props, and sections and display
 * elements by the keys extensions add.
 */
export type TypedLayoutItem<
  TFieldTypes extends Record<string, FieldTypeDef>,
  TExtensionProps extends ExtensionProps = NoExtensionProps,
> =
  | string
  | { field: string; items?: TypedLayoutList<TFieldTypes, TExtensionProps>; span?: number }
  | ({
      type: 'section'
      id?: string
      label?: string
      description?: string
      items: TypedLayoutList<TFieldTypes, TExtensionProps>
      ui?: Ui
      span?: number
    } & TExtensionProps['layout'])
  | {
      type: 'row'
      id?: string
      items: TypedLayoutList<TFieldTypes, TExtensionProps>
      ui?: Ui
      span?: number
    }
  | { type: 'slot'; name: string; span?: number }
  | TypedLayoutDisplay<TFieldTypes, TExtensionProps['field']>

/** A layout written against one builder's field types, and the keys of its extensions. */
export type TypedLayout<
  TFieldTypes extends Record<string, FieldTypeDef>,
  TExtensionProps extends ExtensionProps = NoExtensionProps,
> =
  | { items: TypedLayoutList<TFieldTypes, TExtensionProps>; ui?: Ui }
  | {
      steps: readonly ({
        id?: string
        label?: string
        description?: string
        items: TypedLayoutList<TFieldTypes, TExtensionProps>
        ui?: Ui
      } & TExtensionProps['layout'])[]
      ui?: Ui
    }

/** A definition written against one builder's registries. It is also a `JsonForm`. */
export type TypedForm<
  TFieldTypes extends Record<string, FieldTypeDef>,
  TRules extends Record<string, RuleDef>,
  TFormRules extends Record<string, FormRuleDef>,
  TExtensionProps extends ExtensionProps = NoExtensionProps,
> = {
  $schema?: string
  version: '1'
  fields: readonly TypedField<TFieldTypes, TRules, TExtensionProps['field']>[]
  formRules?: readonly TypedFormRule<TFormRules>[]
  layout?: TypedLayout<TFieldTypes, TExtensionProps>
}
