import { useField } from '@formisch/vue'
import type { JsonField } from '@whatsaaaa/form-builder-schema'
import { type Component, defineComponent, h, type PropType } from 'vue'
import { coerceInput } from './coerce-input'
import type { FieldPath, ValueFieldProps } from './field-components'
import type { FieldNode } from './field-tree'
import type { JsonFormInstance } from './use-json-form'

/** Connects a field with a value to Formisch, and renders your component for it. */
export const ValueField = defineComponent({
  name: 'ValueField',
  props: {
    of: { type: Object as PropType<JsonFormInstance>, required: true },
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

    const setInput = (input: unknown) => {
      field.input = coerceInput(input, props.node.kind, props.node.itemKind) as never
    }

    return () => {
      const fieldProps: ValueFieldProps = {
        field: props.node.field,
        path: props.path,
        kind: props.node.kind,
        required: isRequired(props.node.field),
        input: field.input,
        errors: field.errors,
        inputProps: field.props,
        setInput,
      }
      return h(props.component, fieldProps)
    }
  },
})

const isRequired = (field: JsonField) =>
  field.required === true || (typeof field.required === 'object' && field.required !== null)
