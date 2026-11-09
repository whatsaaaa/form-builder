import {
  checkComponents,
  checkLayoutComponents,
  dotPathOf,
  type FieldNode,
  type LayoutNode,
  selectFields,
} from '@whatsaaaa/form-builder-schema'
import { Fragment, type ReactElement, type ReactNode } from 'react'
import type { FieldComponents, LayoutComponents } from './field-components'
import { type LayoutContext, renderLayout } from './render-layout'
import { type RenderContext, renderFields, resolveComponents } from './render-fields'
import type { AnyJsonFormInstance } from './use-json-form'

export interface JsonFieldsProps {
  /** What `useJsonForm` returned. */
  of: AnyJsonFormInstance
  /** Defaults to the components `useJsonForm` got. */
  components?: FieldComponents | undefined
  /** Defaults to the layout components `useJsonForm` got. */
  layoutComponents?: LayoutComponents | undefined
  /** The content of the layout's slots, by name: `{ submit: <button type="submit">Save</button> }`. */
  slots?: Readonly<Record<string, ReactNode>> | undefined
  /** Renders only these fields, by path, in the order of the definition, without the layout. */
  only?: readonly string[] | undefined
  /**
   * Leaves out these fields, by path, e.g. the ones you place with `<JsonField>`. A section or a
   * row left without fields drops out too.
   */
  except?: readonly string[] | undefined
  /** Renders the step at this index instead of the current one, e.g. on a review page. */
  step?: number | undefined
}

/**
 * Renders the fields of a `useJsonForm` form with your components, one per field type, where the
 * definition's `layout` puts them: the current step, with its sections, rows and slots. It renders
 * nothing of its own, so put it inside Formisch's `<Form>` with your own submit button.
 */
export function JsonFields(props: JsonFieldsProps): ReactElement {
  const { of, only, except } = props
  const ctx: RenderContext = { of, components: resolveComponents(props.components, of) }
  const nodes = selectFields(of.fields, { only, except })
  // Without a layout, it renders the fields the way it always did, and so with `only`.
  if (only || !of.definition.layout) {
    checkComponents(nodes, ctx.components)
    return <>{renderFields(ctx, nodes, [])}</>
  }

  const { layout, steps } = of
  const left = new Set(except)
  const layoutCtx: LayoutContext = {
    ...ctx,
    layoutComponents: props.layoutComponents ?? of.layoutComponents ?? {},
    slots: props.slots ?? {},
    isShown: (node) => !left.has(dotPathOf(node) ?? ''),
  }
  checkComponents(
    layout.steps.flatMap((step) => fieldsOf(step.children)),
    ctx.components,
  )
  checkLayoutComponents(layout, layoutCtx.layoutComponents, layoutCtx.slots)

  const index = props.step ?? steps.index
  const step = steps.list[index]
  if (!step) throw new RangeError(`No step ${props.step}. The form has ${steps.list.length}.`)
  // Keyed by the step, so another step's fields don't take over this one's components.
  return <Fragment key={index}>{renderLayout(layoutCtx, step.children, [])}</Fragment>
}

/** Every field of the nodes, display elements written in the layout included. */
function fieldsOf(nodes: readonly LayoutNode[]): FieldNode[] {
  return nodes.flatMap((node) => {
    if (node.type === 'slot') return []
    const inner = fieldsOf(node.children)
    return node.type === 'field' ? [node.node, ...inner] : inner
  })
}
