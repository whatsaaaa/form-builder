import { type FormSchema, type FormStore, useForm, type ValidationMode } from '@formisch/vue'
import {
  createSchemaBuilder,
  type FieldNode,
  type JsonForm,
  type JsonFormSchema,
  type SchemaBuilder,
  type TypedJsonFormSchema,
} from '@whatsaaaa/form-builder-schema'
import type { FieldComponents } from './field-components'

export interface UseJsonFormOptions {
  /** Builds the schema and knows your own types and rules. Defaults to `createSchemaBuilder()`. */
  builder?: SchemaBuilder
  /** Your component for each field type, so `<JsonFields>` and `<JsonField>` don't need them. */
  components?: FieldComponents
  /** When a field is validated the first time, as in Formisch. */
  validate?: ValidationMode
  /** When a field is validated again after that, as in Formisch. */
  revalidate?: Exclude<ValidationMode, 'initial'>
}

/** What `useJsonForm` returns. Pass it to `<JsonFields>`. */
export interface JsonFormInstance<TSchema extends FormSchema = JsonFormSchema> {
  /** The Formisch form: pass it to Formisch's `<Form :of>`, or to any of its methods. */
  readonly form: FormStore<TSchema>
  readonly definition: JsonForm
  readonly builder: SchemaBuilder
  /** The components from the options, if any. */
  readonly components: FieldComponents | undefined
  /** The definition's fields as a tree, the way `<JsonFields>` renders them. */
  readonly fields: readonly FieldNode[]
}

/** Any form `useJsonForm` returns, typed or not: what the components take. */
export type AnyJsonFormInstance = JsonFormInstance<FormSchema>

/**
 * A Formisch form for a definition, with its schema and initial input from the builder. A
 * definition with issues throws the builder's `DefinitionError`, so run `validate()` first when it
 * comes from outside your code. The definition is read once: give the form a new `:key` to use
 * another one.
 */
export function useJsonForm(definition: JsonForm, options?: UseJsonFormOptions): JsonFormInstance
/**
 * The same, with the form typed by your input type, and output type when it differs, so Formisch's
 * paths and values are checked. The types are yours to keep in step with the definition.
 */
export function useJsonForm<TInput extends object, TOutput extends object = TInput>(
  definition: JsonForm,
  options?: UseJsonFormOptions,
): JsonFormInstance<TypedJsonFormSchema<TInput, TOutput>>
export function useJsonForm(
  definition: JsonForm,
  options: UseJsonFormOptions = {},
): JsonFormInstance {
  const builder = options.builder ?? createSchemaBuilder()
  const form = useForm({
    schema: builder.build(definition),
    initialInput: builder.getInitialInput(definition),
    validate: options.validate,
    revalidate: options.revalidate,
  })
  const { components } = options
  return { form, definition, builder, components, fields: builder.getFieldTree(definition) }
}
