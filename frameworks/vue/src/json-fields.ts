import { checkComponents, selectFields } from '@whatsaaaa/form-builder-schema'
import { defineComponent, type PropType } from 'vue'
import type { FieldComponents } from './field-components'
import { type RenderContext, renderFields, resolveComponents } from './render-fields'
import type { AnyJsonFormInstance } from './use-json-form'

/**
 * Renders the fields of a `useJsonForm` form with your components, one per field type. It renders
 * nothing of its own, so put it inside Formisch's `<Form>` with your own submit button. `only` and
 * `except` are read when it sets up.
 */
export const JsonFields = defineComponent({
  name: 'JsonFields',
  props: {
    /** What `useJsonForm` returned. */
    of: { type: Object as PropType<AnyJsonFormInstance>, required: true },
    /** Defaults to the components `useJsonForm` got. */
    components: { type: Object as PropType<FieldComponents> },
    /** Renders only these fields, by path, in the order of the definition. */
    only: { type: Array as PropType<readonly string[]> },
    /** Leaves out these fields, by path, e.g. the ones you place with `<JsonField>`. */
    except: { type: Array as PropType<readonly string[]> },
  },
  setup(props) {
    const ctx: RenderContext = {
      of: props.of,
      components: resolveComponents(props.components, props.of),
    }
    const nodes = selectFields(props.of.fields, { only: props.only, except: props.except })
    checkComponents(nodes, ctx.components)

    return () => renderFields(ctx, nodes, [])
  },
})
