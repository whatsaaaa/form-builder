import { insert, move, remove, useFieldArray } from '@formisch/vue'
import { type Component, defineComponent, h, type PropType, type VNode } from 'vue'
import type { ArrayFieldProps, FieldPath } from './field-components'
import type { FieldNode } from './field-tree'
import { itemInput } from './item-input'
import type { AnyJsonFormInstance } from './use-json-form'

/** Connects a container of kind `array` to Formisch, and renders your component for it. */
export const ArrayField = defineComponent({
  name: 'ArrayField',
  props: {
    of: { type: Object as PropType<AnyJsonFormInstance>, required: true },
    node: { type: Object as PropType<FieldNode>, required: true },
    path: { type: Array as PropType<FieldPath>, required: true },
    component: { type: [Object, Function] as PropType<Component>, required: true },
    /** Renders the fields of the item at `index`. */
    renderItem: { type: Function as PropType<(index: number) => VNode[]>, required: true },
  },
  setup(props) {
    // The path comes from the definition at runtime, so the schema's types can't check it.
    const path = () => props.path as never
    const array = useFieldArray(
      () => props.of.form,
      () => ({ path: path() }),
    )

    const methods = {
      // A new item starts with the defaults of its fields, like the items of a new form.
      add: () =>
        insert(props.of.form, {
          path: path(),
          initialInput: itemInput(props.of.builder, props.node) as never,
        }),
      remove: (index: number) => remove(props.of.form, { path: path(), at: index }),
      move: (from: number, to: number) => move(props.of.form, { path: path(), from, to }),
    }

    return () => {
      const fieldProps: ArrayFieldProps = {
        field: props.node.field,
        path: props.path,
        items: array.items,
        errors: array.errors,
        ...methods,
      }
      return h(props.component, fieldProps, {
        default: ({ index }: { index: number }) => props.renderItem(index),
      })
    }
  },
})
