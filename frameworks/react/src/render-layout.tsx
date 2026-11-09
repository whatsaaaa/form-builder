import type { IsFieldShown, LayoutNode } from '@whatsaaaa/form-builder-schema'
import { type ComponentType, Fragment, type ReactElement, type ReactNode } from 'react'
import type { LayoutComponents, RowProps, SectionProps } from './field-components'
import { type RenderContext, renderField } from './render-fields'

/** What `<JsonFields>` renders a layout with. */
export interface LayoutContext extends RenderContext {
  layoutComponents: LayoutComponents
  /** The content of the layout's slots, by name. */
  slots: Readonly<Record<string, ReactNode>>
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
): ReactElement[] {
  return ctx.of.visibility
    .shownNodes(nodes, indexes, ctx.isShown)
    .map((node) => renderNode(ctx, node, indexes))
}

function renderNode(
  ctx: LayoutContext,
  node: LayoutNode,
  indexes: readonly number[],
): ReactElement {
  const { key } = node
  switch (node.type) {
    case 'field':
      return renderField(ctx, node.node, indexes, key, (inner) =>
        renderLayout(ctx, node.children, inner),
      )
    case 'section': {
      // The layout was checked for components.
      const Section = ctx.layoutComponents.section as ComponentType<SectionProps>
      return (
        <Section key={key} section={node.section}>
          {renderLayout(ctx, node.children, indexes)}
        </Section>
      )
    }
    case 'row': {
      const Row = ctx.layoutComponents.row as ComponentType<RowProps>
      return (
        <Row key={key} row={node.row} spans={node.children.map((cell) => cell.span)}>
          {(index) => renderNode(ctx, node.children[index] as LayoutNode, indexes)}
        </Row>
      )
    }
    case 'slot':
      return <Fragment key={key}>{ctx.slots[node.name]}</Fragment>
  }
}
