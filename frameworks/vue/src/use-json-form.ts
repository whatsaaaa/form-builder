import { type FormStore, useForm, type ValidationMode } from '@formisch/vue'
import {
  createSchemaBuilder,
  type JsonForm,
  type SchemaBuilder,
} from '@whatsaaaa/form-builder-schema'
import { type FieldNode, fieldTree } from './field-tree'

export interface UseJsonFormOptions {
  /** Builds the schema and knows your own types and rules. Defaults to `createSchemaBuilder()`. */
  builder?: SchemaBuilder
  /** When a field is validated the first time, as in Formisch. */
  validate?: ValidationMode
  /** When a field is validated again after that, as in Formisch. */
  revalidate?: Exclude<ValidationMode, 'initial'>
}

/** The schema of a definition, as the builder builds it. */
export type JsonFormSchema = ReturnType<SchemaBuilder['build']>

/** What `useJsonForm` returns. Pass it to `<JsonFields>`. */
export interface JsonFormInstance {
  /** The Formisch form: pass it to Formisch's `<Form :of>`, or to any of its methods. */
  readonly form: FormStore<JsonFormSchema>
  readonly definition: JsonForm
  readonly builder: SchemaBuilder
  /** The definition's fields as a tree, the way `<JsonFields>` renders them. */
  readonly fields: readonly FieldNode[]
}

/**
 * A Formisch form for a definition, with its schema and initial input from the builder. A
 * definition with issues throws the builder's `DefinitionError`, so run `validate()` first when it
 * comes from outside your code. The definition is read once: give the form a new `:key` to use
 * another one.
 */
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
  return { form, definition, builder, fields: fieldTree(builder, definition) }
}
