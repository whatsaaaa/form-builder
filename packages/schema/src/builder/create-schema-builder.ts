import type * as v from 'valibot'
import type { KindDef } from '../kinds/kind-def'
import type { FieldTypeDef } from '../field-types/field-type-def'
import type { defaultFieldTypes } from '../field-types/default-field-types'
import type { FormRuleDef } from '../rules/form-rule-def'
import type { defaultFormRules } from '../rules/form-rules'
import type { RuleDef } from '../rules/rule-def'
import type { defaultRules } from '../rules/default-rules'
import type { MessageContext, Messages } from './build-field-schema'
import { compileDefinition } from './compile-definition'
import { mergeRegistry } from './registry'
import type { TypedForm } from './typed-form'
import { checkRegistry } from './validate-definition'
import { DefinitionError, type ValidateResult } from '../errors/definition-error'
import type { JsonForm } from '../definition/json-form-schema'
import type { ValueKind } from '../shared/value-kind'

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
   * `messages.required`, e.g. to treat them as i18n keys. Return undefined to use the text as
   * written.
   */
  resolveMessage?(key: string, ctx: MessageContext): string | undefined
}

/** What `createSchemaBuilder` returns. Its type parameters are the registries, by key. */
export interface SchemaBuilder<
  TFieldTypes extends Record<string, FieldTypeDef> = Record<string, FieldTypeDef>,
  TRules extends Record<string, RuleDef> = Record<string, RuleDef>,
  TFormRules extends Record<string, FormRuleDef> = Record<string, FormRuleDef>,
> {
  /** The definition's schema. Throws one `DefinitionError` with every issue it has. */
  build(json: JsonForm): v.ObjectSchema<v.ObjectEntries, undefined>
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

  const messages: Messages = {
    required: options.messages?.required ?? 'Required',
    resolve: (text, ctx) => options.resolveMessage?.(text, ctx) ?? text,
  }

  function validate(json: unknown): ValidateResult {
    const { issues } = compileDefinition(json, registry, messages)
    return issues.length ? { success: false, issues } : { success: true, issues: [] }
  }

  function build(json: JsonForm) {
    const { issues, schema } = compileDefinition(json, registry, messages)
    if (issues.length) throw new DefinitionError(issues)
    return schema
  }

  function rulesForKind(kind: ValueKind): [name: string, def: RuleDef][] {
    return Object.entries(registry.rules).filter(([, def]) => def.kinds.includes(kind))
  }

  return {
    build,
    validate,
    defineForm: (definition) => definition,
    rulesForKind,
    kinds: registry.kinds,
    fieldTypes: registry.fieldTypes,
    rules: registry.rules,
    formRules: registry.formRules,
  }
}
