import {
  allLayoutNodes,
  checkComponents,
  checkLayoutComponents,
  dotPathOf,
  type FieldNode,
  type LayoutStep,
  selectFields,
} from '@whatsaaaa/form-builder-schema'
import { defineComponent, type PropType } from 'vue'
import type { FieldComponents, LayoutComponents } from './field-components'
import { type LayoutContext, renderLayout } from './render-layout'
import { type RenderContext, renderFields, resolveComponents } from './render-fields'
import type { AnyJsonFormInstance } from './use-json-form'

/**
 * Renders the fields of a `useJsonForm` form with your components, one per field type, where the
 * definition's `layout` puts them: the current step, with its sections, rows and slots. It renders
 * nothing of its own, so put it inside Formisch's `<Form>` with your own submit button. Its named
 * slots fill the layout's slots. `only` and `except` are read when it sets up.
 */
export const JsonFields = defineComponent({
  name: 'JsonFields',
  props: {
    /** What `useJsonForm` returned. */
    of: { type: Object as PropType<AnyJsonFormInstance>, required: true },
    /** Defaults to the components `useJsonForm` got. */
    components: { type: Object as PropType<FieldComponents> },
    /** Defaults to the layout components `useJsonForm` got. */
    layoutComponents: { type: Object as PropType<LayoutComponents> },
    /** Renders only these fields, by path, in the order of the definition, without the layout. */
    only: { type: Array as PropType<readonly string[]> },
    /**
     * Leaves out these fields, by path, e.g. the ones you place with `<JsonField>`. A section or a
     * row left without fields drops out too.
     */
    except: { type: Array as PropType<readonly string[]> },
    /** Renders the step at this index instead of the current one, e.g. on a review page. */
    step: { type: Number },
  },
  setup(props, { slots }) {
    const ctx: RenderContext = {
      of: props.of,
      components: resolveComponents(props.components, props.of),
    }
    const nodes = selectFields(props.of.fields, { only: props.only, except: props.except })
    // Without a layout, it renders the fields the way it always did, and so with `only`.
    if (props.only || !props.of.definition.layout) {
      checkComponents(nodes, ctx.components)
      return () => renderFields(ctx, nodes, [])
    }

    const { layout, steps } = props.of
    const except = new Set(props.except)
    const layoutCtx: LayoutContext = {
      ...ctx,
      layoutComponents: props.layoutComponents ?? props.of.layoutComponents ?? {},
      slots,
      isShown: (node) => !except.has(dotPathOf(node) ?? ''),
    }
    checkComponents(fieldsOf(layout.steps), ctx.components)
    checkLayoutComponents(layout, layoutCtx.layoutComponents, slots)

    return () => {
      const step = props.step === undefined ? steps.current : steps.list[props.step]
      if (!step) throw new RangeError(`No step ${props.step}. The form has ${steps.list.length}.`)
      return renderLayout(layoutCtx, step.children, [])
    }
  },
})

/** Every field of the steps, display elements written in the layout included. */
function fieldsOf(steps: readonly LayoutStep[]): FieldNode[] {
  return steps.flatMap((step) =>
    [...allLayoutNodes(step.children)].flatMap((node) =>
      node.type === 'field' ? [node.node] : [],
    ),
  )
}
