import {
  type FormSchema,
  type FormStore,
  getInput,
  setInput,
  useForm,
  type ValidationMode,
} from '@formisch/vue'
import {
  createSchemaBuilder,
  type FieldNode,
  type FormLayout,
  type JsonForm,
  type JsonFormSchema,
  type SchemaBuilder,
  type TypedJsonFormSchema,
  type VisibilityState,
} from '@whatsaaaa/form-builder-schema'
import { computed, watch } from 'vue'
import type { FieldComponents, LayoutComponents } from './field-components'
import { type JsonFormSteps, useJsonFormSteps } from './json-form-steps'

export interface UseJsonFormOptions {
  /** Builds the schema and knows your own types and rules. Defaults to `createSchemaBuilder()`. */
  builder?: SchemaBuilder
  /** Your component for each field type, so `<JsonFields>` and `<JsonField>` don't need them. */
  components?: FieldComponents
  /** Your component for each layout type the definition's `layout` uses, like `section`. */
  layoutComponents?: LayoutComponents
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
  /** The layout components from the options, if any. */
  readonly layoutComponents: LayoutComponents | undefined
  /** The definition's fields as a tree, for `<JsonFields :only>` and `<JsonField>`. */
  readonly fields: readonly FieldNode[]
  /** The definition's layout, the way `<JsonFields>` renders it. */
  readonly layout: FormLayout
  /** The layout's steps: the current one, and Next, Back and Go to. A form without steps has one. */
  readonly steps: JsonFormSteps
  /**
   * What the conditions of the builder's extensions hide for the form's input now, like the
   * `affects` of `@whatsaaaa/form-builder-affects`: `<JsonFields>` and `<JsonField>` leave it out.
   * Read it in your own renderers. Without conditions, it hides nothing.
   */
  readonly visibility: VisibilityState
}

/** Any form `useJsonForm` returns, typed or not: what the components take. */
export type AnyJsonFormInstance = JsonFormInstance<FormSchema>

/**
 * A Formisch form for a definition, with its schema and initial input from the builder. A
 * definition with issues throws the builder's `DefinitionError`, so run `validate()` first when it
 * comes from outside your code. The definition is read once: give the form a new `:key` to use
 * another one. With conditions, it clears the fields they clear as soon as they do, with
 * Formisch's `setInput`, wherever the fields are rendered.
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
  const layout = builder.getLayout(definition)
  const visibility = builder.getVisibility(definition)
  // Without conditions, nothing is hidden whatever the input, so the input isn't watched.
  const state = visibility.conditional
    ? computed(() => visibility.of(getInput(form)))
    : { value: visibility.of(undefined) }
  // A new state means something to clear may have come. It is empty once the fields are blank.
  if (visibility.conditional) {
    watch(
      () => state.value.toClear,
      (fields) => {
        // The paths come from the definition at runtime, so the schema's types can't check them.
        for (const { path, input } of fields) setInput(form, { path, input } as never)
      },
    )
  }
  return {
    form,
    definition,
    builder,
    components: options.components,
    layoutComponents: options.layoutComponents,
    fields: builder.getFieldTree(definition),
    layout,
    steps: useJsonFormSteps(form, layout, options, state),
    get visibility() {
      return state.value
    },
  }
}
