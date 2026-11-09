import { type FieldElementProps, useField } from '@formisch/vue'
import {
  coerceInput,
  type FieldNode,
  type FieldPath,
  isRequired,
} from '@whatsaaaa/form-builder-schema'
import { type Component, defineComponent, h, type PropType } from 'vue'
import type { ValueFieldProps } from './field-components'
import { fieldEventsOf } from './json-form-steps'
import type { AnyJsonFormInstance } from './use-json-form'

/** Connects a field with a value to Formisch, and renders your component for it. */
export const ValueField = defineComponent({
  name: 'ValueField',
  props: {
    of: { type: Object as PropType<AnyJsonFormInstance>, required: true },
    node: { type: Object as PropType<FieldNode>, required: true },
    path: { type: Array as PropType<FieldPath>, required: true },
    component: { type: [Object, Function] as PropType<Component>, required: true },
  },
  setup(props) {
    // The path comes from the definition at runtime, so the schema's types can't check it.
    const field = useField(
      () => props.of.form,
      () => ({ path: props.path as never }),
    )

    // In a form with steps, a step that failed Next revalidates on these events too.
    const events = fieldEventsOf(props.of.form)
    const setInput = (input: unknown) => {
      field.input = coerceInput(input, props.node) as never
      events?.('input')
    }
    const inputProps: FieldElementProps = events
      ? {
          get name() {
            return field.props.name
          },
          get autofocus() {
            return field.props.autofocus
          },
          ref: (element) => field.props.ref(element),
          onFocus: () => {
            field.props.onFocus()
            events('touch')
          },
          onChange: (event) => {
            field.props.onChange(event)
            events('change')
          },
          onBlur: () => {
            field.props.onBlur()
            events('blur')
          },
        }
      : field.props

    return () => {
      const fieldProps: ValueFieldProps = {
        field: props.node.field,
        path: props.path,
        kind: props.node.kind,
        required: isRequired(props.node.field),
        input: field.input,
        errors: field.errors,
        inputProps,
        setInput,
      }
      return h(props.component, fieldProps)
    }
  },
})
