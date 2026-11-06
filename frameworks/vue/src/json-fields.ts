import { defineComponent, type PropType } from 'vue'
import type { FieldComponents } from './field-components'
import { allFields, findField, pathOf } from './field-paths'
import type { FieldNode } from './field-tree'
import {
  checkComponents,
  type RenderContext,
  renderFields,
  resolveComponents,
} from './render-fields'
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
    const fields = props.of.fields
    const except = new Set(props.except)
    // A path that names no field is a typo, so check them even though nothing uses the result.
    for (const path of except) findField(fields, path, false)

    const ctx: RenderContext = {
      of: props.of,
      components: resolveComponents(props.components, props.of),
      skip: (node) => except.has(pathOf(node) ?? ''),
    }
    const nodes = props.only ? onlyFields(fields, props.only) : fields
    checkComponents(ctx, nodes)

    return () => renderFields(ctx, nodes, [])
  },
})

/** The fields `only` names, in the order of the definition, each once. */
function onlyFields(fields: readonly FieldNode[], only: readonly string[]): FieldNode[] {
  const named = new Set(only.map((path) => findField(fields, path, true)))
  return [...allFields(fields)].filter((node) => named.has(node))
}
