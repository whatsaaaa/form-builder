import type * as v from 'valibot'
import type { JsonField, JsonForm } from '../definition/json-form-schema'
import type { WalkedField } from '../definition/walk-fields'
import { DefinitionError, type ValidateResult } from '../errors/definition-error'
import type { defaultFieldTypes } from '../field-types/default-field-types'
import type { FieldTypeDef } from '../field-types/field-type-def'
import type { KindDef } from '../kinds/kind-def'
import { type FieldNode, fieldTree } from '../render/field-tree'
import type { defaultRules } from '../rules/default-rules'
import type { FormRuleDef } from '../rules/form-rule-def'
import type { defaultFormRules } from '../rules/form-rules'
import type { RuleDef } from '../rules/rule-def'
import type { ValueKind } from '../shared/value-kind'
import type { MessageContext, Messages } from './build-field-schema'
import { checkRegistry } from './check-registry'
import { compileDefinition, createCompiler, type JsonFormSchema } from './compile-definition'
import { lookup, mergeRegistry } from './registry'
import type { TypedForm } from './typed-form'

export interface SchemaBuilderOptions {
  kinds?: Record<string, KindDef>
  fieldTypes?: Record<string, FieldTypeDef>
  rules?: Record<string, RuleDef>
  formRules?: Record<string, FormRuleDef>
  /** With false, only your own rules and form rules are registered. Defaults to true. */
  includeDefaultRules?: boolean
  messages?: { required?: string }
  /**
   * Called with every message from the definition, each field's label and description, and
   * `messages.required` for each required field without a message of its own, e.g. to treat them
   * as i18n keys. Return undefined to use the text as written.
   */
  resolveMessage?(key: string, ctx: MessageContext): string | undefined
}

/**
 * The messages a builder uses: `messages.required` defaults to `'Required'`, and
 * `resolveMessage` can replace any text, falling back to the text as written.
 */
export function createMessages(
  options: Pick<SchemaBuilderOptions, 'messages' | 'resolveMessage'> = {},
): Messages {
  return {
    required: options.messages?.required ?? 'Required',
    // Called on `options`, so a `resolveMessage` method keeps its `this`.
    resolve: (text, ctx) => options.resolveMessage?.(text, ctx) ?? text,
  }
}

/**
 * The schema type of `build<TInput, TOutput>()`: your types, so Formisch's paths and values are
 * checked. An interface works too, which Formisch's own constraint wouldn't take as it is.
 */
export type TypedJsonFormSchema<
  TInput extends object,
  TOutput extends object = TInput,
> = v.GenericSchema<Plain<TInput>, Plain<TOutput>>

/** The same type as an object literal type, which has the index signature Formisch requires. */
type Plain<T> = { [K in keyof T]: T[K] }

/** What `createSchemaBuilder` returns. Its type parameters are the registries, by key. */
export interface SchemaBuilder<
  TFieldTypes extends Record<string, FieldTypeDef> = Record<string, FieldTypeDef>,
  TRules extends Record<string, RuleDef> = Record<string, RuleDef>,
  TFormRules extends Record<string, FormRuleDef> = Record<string, FormRuleDef>,
> {
  /**
   * The definition's schema: an object schema, in a pipe with the form rules when it has any.
   * Throws one `DefinitionError` with every issue it has.
   */
  build(json: JsonForm): JsonFormSchema
  /**
   * The same schema, typed by your input type, and output type when it differs, so Formisch's
   * paths and values are checked. The types are a promise you make: nothing checks them against
   * the definition.
   */
  build<TInput extends object, TOutput extends object = TInput>(
    json: JsonForm,
  ): TypedJsonFormSchema<TInput, TOutput>
  /** Every issue in the definition, in document order. Never throws on bad input. */
  validate(json: unknown): ValidateResult
  /**
   * Types a definition written in TypeScript: unknown types, rules and keys, and params of the
   * wrong type, are compile errors. It returns the definition unchanged, and doesn't replace
   * `validate()`, which also checks names, defaults and form rule paths.
   */
  defineForm(
    definition: TypedForm<TFieldTypes, TRules, TFormRules>,
  ): TypedForm<TFieldTypes, TRules, TFormRules>
  /**
   * Every field of the definition, at every depth, like the `walkFields` function, but it reads
   * this builder's container types too. It never throws. A container with issues isn't built, so
   * the fields inside it are left out: run `validate()` first when that matters.
   */
  walkFields(json: JsonForm): Generator<WalkedField, void, undefined>
  /**
   * Formisch's `initialInput`, like the `getInitialInput` function, but it reads this builder's
   * container types too. A container of kind `object` gives an object, and one of kind `array`
   * without a default gives `[]`. It never throws, and leaves out a field with issues, but a
   * field whose only issue is its default still gets that default.
   */
  getInitialInput(json: JsonForm): Record<string, unknown>
  /**
   * The input of a new item of an array, for Formisch's `insert()`: an object of the defaults of
   * its `fields`, or the default of its `of` field. It reads this builder's container types too,
   * and never throws. Undefined for a field that isn't a container of kind `array`.
   */
  getItemInput(field: JsonField): unknown
  /**
   * The definition's fields as a tree, each with its role, for a renderer. It reads this builder's
   * types, so your own containers are groups or arrays by their kind. Throws one `DefinitionError`
   * with every issue the definition has, like `build()`.
   */
  getFieldTree(json: JsonForm): FieldNode[]
  /** The registered rules that can be used on a field of `kind`, e.g. for a rule picker. */
  rulesForKind(kind: ValueKind): [name: string, def: RuleDef][]
  readonly kinds: Readonly<Record<string, KindDef>>
  readonly fieldTypes: Readonly<TFieldTypes>
  readonly rules: Readonly<TRules>
  readonly formRules: Readonly<TFormRules>
}

/** Your entries replace the defaults with the same key. */
type Merge<TDefaults, TOwn> = Omit<TDefaults, keyof TOwn> & TOwn

/** The rules or form rules a builder has: yours, plus the defaults unless they are left out. */
type WithDefaults<
  TDefaults,
  TOwn,
  TIncludeDefaultRules extends boolean,
> = TIncludeDefaultRules extends false ? TOwn : Merge<TDefaults, TOwn>

/**
 * The type parameters keep the keys of your registries, so `defineForm` knows every type, rule
 * and form rule by name. They come from the second half of the options type: the first half
 * still types the functions you write inline, like a field type's `schema()`.
 */
export function createSchemaBuilder<
  TFieldTypes extends Record<string, FieldTypeDef> = Record<never, never>,
  TRules extends Record<string, RuleDef> = Record<never, never>,
  TFormRules extends Record<string, FormRuleDef> = Record<never, never>,
  TIncludeDefaultRules extends boolean = true,
>(
  options?: SchemaBuilderOptions & {
    fieldTypes?: TFieldTypes
    rules?: TRules
    formRules?: TFormRules
    includeDefaultRules?: TIncludeDefaultRules
  },
): SchemaBuilder<
  Merge<typeof defaultFieldTypes, TFieldTypes>,
  WithDefaults<typeof defaultRules, TRules, TIncludeDefaultRules>,
  WithDefaults<typeof defaultFormRules, TFormRules, TIncludeDefaultRules>
>
/** For options whose registries have no known keys, e.g. a union of two option objects. */
export function createSchemaBuilder(options?: SchemaBuilderOptions): SchemaBuilder
export function createSchemaBuilder(options: SchemaBuilderOptions = {}): SchemaBuilder {
  const registry = mergeRegistry(options)
  checkRegistry(registry)
  const messages = createMessages(options)

  function validate(json: unknown): ValidateResult {
    const { issues } = compileDefinition(json, registry, messages)
    return issues.length ? { success: false, issues } : { success: true, issues: [] }
  }

  function build(json: JsonForm): JsonFormSchema {
    const { issues, schema } = compileDefinition(json, registry, messages)
    if (issues.length) throw new DefinitionError(issues)
    return schema
  }

  function* walkFields(json: JsonForm): Generator<WalkedField, void, undefined> {
    yield* compileDefinition(json, registry, messages).walked
  }

  function getInitialInput(json: JsonForm): Record<string, unknown> {
    return compileDefinition(json, registry, messages).initialInput
  }

  function getItemInput(field: JsonField): unknown {
    return createCompiler(registry, messages, []).itemInput(field, [])
  }

  function getFieldTree(json: JsonForm): FieldNode[] {
    const { issues, walked } = compileDefinition(json, registry, messages)
    if (issues.length) throw new DefinitionError(issues)
    return fieldTree(walked, (type) => lookup(registry.fieldTypes, type)?.container === true)
  }

  function rulesForKind(kind: ValueKind): [name: string, def: RuleDef][] {
    return Object.entries(registry.rules).filter(([, def]) => def.kinds.includes(kind))
  }

  return {
    // The types build<TInput, TOutput>() gives are yours: the schema is the same.
    build: build as SchemaBuilder['build'],
    validate,
    defineForm: (definition) => definition,
    walkFields,
    getInitialInput,
    getItemInput,
    getFieldTree,
    rulesForKind,
    kinds: registry.kinds,
    fieldTypes: registry.fieldTypes,
    rules: registry.rules,
    formRules: registry.formRules,
  }
}
