import { checkComponents, dotPathOf, findField } from '@whatsaaaa/form-builder-schema'
import { defineComponent, type PropType } from 'vue'
import type { FieldComponents } from './field-components'
import { type RenderContext, renderField, renderFields, resolveComponents } from './render-fields'
import type { AnyJsonFormInstance } from './use-json-form'

/**
 * Renders one field of a `useJsonForm` form, wherever you put it inside Formisch's `<Form>`. A
 * group or an array comes with its fields. Leave the field out of `<JsonFields>` with `except`.
 */
export const JsonField = defineComponent({
  name: 'JsonField',
  props: {
    /** What `useJsonForm` returned. */
    of: { type: Object as PropType<AnyJsonFormInstance>, required: true },
    /** The field's path: `'email'`, or `'address.city'` for a field of a group. */
    path: { type: String, required: true },
    /** Defaults to the components `useJsonForm` got. */
    components: { type: Object as PropType<FieldComponents> },
  },
  setup(props) {
    const node = findField(props.of.fields, props.path, { placed: true })
    const ctx: RenderContext = {
      of: props.of,
      components: resolveComponents(props.components, props.of),
    }
    checkComponents([node], ctx.components)

    return () =>
      renderField(ctx, node, [], dotPathOf(node) ?? '#0', (indexes) =>
        renderFields(ctx, node.children, indexes),
      )
  },
})
