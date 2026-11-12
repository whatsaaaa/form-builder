import {
  type FormConfig,
  type FormSchema,
  type FormStore,
  setInput,
  useForm,
  type ValidationMode,
} from '@formisch/react'
import {
  createSchemaBuilder,
  type FieldNode,
  type FormLayout,
  type JsonForm,
  type BuiltSchema,
  type SchemaBuilder,
  type TypedBuiltSchema,
  type VisibilityState,
} from '@whatsaaaa/form-builder-schema'
import { useEffect, useMemo, useState } from 'react'
import type { FieldComponents, LayoutComponents } from './field-components'
import { type JsonFormSteps, useJsonFormSteps } from './json-form-steps'
import { mergeInitialInput } from './merge-initial-input'
import { useVisibility } from './use-visibility'

/** The options of `useJsonForm`. `TSchema` is the form's schema, which types `initialInput`. */
export interface UseJsonFormOptions<TSchema extends FormSchema = BuiltSchema> {
  /** Builds the schema and knows your own types and rules. Defaults to `createSchemaBuilder()`. */
  builder?: SchemaBuilder
  /**
   * The values the form starts with, like a record to edit, or the input of the form this one
   * replaces. They go over the definition's defaults: a field without a key keeps its `default`,
   * and a key that is there wins with any value, so `undefined` starts the field blank. The fields
   * of a group are merged the same way. A list is taken whole, each item over what a new item
   * starts with. A key that is no field is ignored, and a field its conditions clear starts blank.
   * Typed like Formisch's own `initialInput`: your input type, with every key optional.
   */
  initialInput?: FormConfig<TSchema>['initialInput']
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
export interface JsonFormInstance<TSchema extends FormSchema = BuiltSchema> {
  /** The Formisch form: pass it to Formisch's `<Form of>`, or to any of its methods. */
  readonly form: FormStore<TSchema>
  readonly definition: JsonForm
  readonly builder: SchemaBuilder
  /** The components from the options, if any. */
  readonly components: FieldComponents | undefined
  /** The layout components from the options, if any. */
  readonly layoutComponents: LayoutComponents | undefined
  /** The definition's fields as a tree, for `<JsonFields only>` and `<JsonField>`. */
  readonly fields: readonly FieldNode[]
  /** The definition's layout, the way `<JsonFields>` renders it. */
  readonly layout: FormLayout
  /** The layout's steps: the current one, and Next, Back and Go to. A form without steps has one. */
  readonly steps: JsonFormSteps
  /**
   * What the conditions of the builder's extensions hide for the form's input now, like the
   * `affects` of `@whatsaaaa/form-builder-affects`: `<JsonFields>` and `<JsonField>` leave it out.
   * Read it in your own renderers. A new object only when what is hidden changes, so the form
   * re-renders for that, not for every keystroke. Without conditions, it hides nothing.
   */
  readonly visibility: VisibilityState
}

/** Any form `useJsonForm` returns, typed or not: what the components take. */
export type AnyJsonFormInstance = JsonFormInstance<FormSchema>

/**
 * A Formisch form for a definition, with its schema and initial input from the builder, and the
 * `initialInput` of the options over it. A definition with issues throws the builder's
 * `DefinitionError`, so run `validate()` first when it comes from outside your code. Like
 * Formisch's `useForm`, it reads the definition, the builder, the initial input and the validation
 * modes on the first render: give the component a new `key` to use another definition. The
 * components and layout components are read on every render. With conditions, it clears the fields
 * they clear as soon as they do, with Formisch's `setInput`, wherever the fields are rendered.
 */
export function useJsonForm(definition: JsonForm, options?: UseJsonFormOptions): JsonFormInstance
/**
 * The same, with the form typed by your input type, and output type when it differs, so Formisch's
 * paths and values are checked. The types are yours to keep in step with the definition.
 */
export function useJsonForm<TInput extends object, TOutput extends object = TInput>(
  definition: JsonForm,
  options?: UseJsonFormOptions<TypedBuiltSchema<TInput, TOutput>>,
): JsonFormInstance<TypedBuiltSchema<TInput, TOutput>>
export function useJsonForm(
  definition: JsonForm,
  options: UseJsonFormOptions = {},
): JsonFormInstance {
  // Formisch reads its config on the first render only, so the schema is built once too.
  const [built] = useState(() => {
    const builder = options.builder ?? createSchemaBuilder()
    return {
      definition,
      builder,
      schema: builder.build(definition),
      initialInput: mergeInitialInput(builder, definition, options.initialInput),
      fields: builder.getFieldTree(definition),
      layout: builder.getLayout(definition),
      visibility: builder.getVisibility(definition),
    }
  })
  const form = useForm({
    schema: built.schema,
    initialInput: built.initialInput,
    validate: options.validate,
    revalidate: options.revalidate,
  })
  const visibility = useVisibility(form, built.visibility)
  // A new state means something to clear may have come. It is empty once the fields are blank.
  const { toClear } = visibility
  useEffect(() => {
    // The paths come from the definition at runtime, so the schema's types can't check them.
    for (const { path, input } of toClear) setInput(form, { path, input } as never)
  }, [form, toClear])
  const steps = useJsonFormSteps(form, built.layout, options, visibility)
  const { components, layoutComponents } = options
  return useMemo(
    () => ({
      form,
      definition: built.definition,
      builder: built.builder,
      components,
      layoutComponents,
      fields: built.fields,
      layout: built.layout,
      steps,
      visibility,
    }),
    [form, built, components, layoutComponents, steps, visibility],
  )
}
