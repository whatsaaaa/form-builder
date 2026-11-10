import type { IsFieldShown, LayoutNode } from '@whatsaaaa/form-builder-schema'
import { type Component, Fragment, h, type Slots, type VNode } from 'vue'
import type { LayoutComponents } from './field-components'
import { type RenderContext, renderField } from './render-fields'

/** What `<JsonFields>` renders a layout with. */
export interface LayoutContext extends RenderContext {
  layoutComponents: LayoutComponents
  /** The content of the layout's slots, by name. */
  slots: Slots
  /** False for a field left out with `except`. */
  isShown: IsFieldShown
}

/**
 * Renders layout nodes. A field left out or hidden by conditions drops out, and so does a section
 * hidden by them, and a section or a row left without fields. `indexes` are the indexes of the
 * array items the nodes are in, outermost first.
 */
export function renderLayout(
  ctx: LayoutContext,
  nodes: readonly LayoutNode[],
  indexes: readonly number[],
): VNode[] {
  return ctx.of.visibility
    .shownNodes(nodes, indexes, ctx.isShown)
    .map((node) => renderNode(ctx, node, indexes))
}

function renderNode(ctx: LayoutContext, node: LayoutNode, indexes: readonly number[]): VNode {
  const { key } = node
  switch (node.type) {
    case 'field':
      return renderField(ctx, node.node, indexes, key, (inner) =>
        renderLayout(ctx, node.children, inner),
      )
    case 'section':
      return h(
        ctx.layoutComponents.section as Component,
        { key, section: node.section },
        { default: () => renderLayout(ctx, node.children, indexes) },
      )
    case 'row':
      return h(
        ctx.layoutComponents.row as Component,
        { key, row: node.row, spans: node.children.map((cell) => cell.span) },
        {
          default: ({ index }: { index: number }) => [
            renderNode(ctx, node.children[index] as LayoutNode, indexes),
          ],
        },
      )
    case 'slot':
      return h(Fragment, { key }, ctx.slots[node.name]?.())
  }
}
