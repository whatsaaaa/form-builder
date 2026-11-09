import type { FieldNode } from './field-tree'
import type { LayoutNode } from './form-layout'

/**
 * Whether a field is shown, e.g. by the conditions of the affects package. `indexes` are those of
 * the array items the field is in, outermost first.
 */
export type IsFieldShown = (node: FieldNode, indexes: readonly number[]) => boolean

/**
 * The nodes to render when some fields are hidden. A hidden field drops out, with every field
 * inside it. A group, a section or a row whose fields are all hidden drops out too, even when it
 * holds display elements. One that has no field with a value at all, only text, always stays. A
 * row's other cells keep their spans, and line up from its first column: a row is one line, so no
 * field moves to another. An array's items aren't looked into: call it for each item, with its
 * indexes.
 */
export function shownNodes(
  nodes: readonly LayoutNode[],
  indexes: readonly number[],
  isShown: IsFieldShown,
): LayoutNode[] {
  return nodes.flatMap((node): LayoutNode[] => {
    if (node.type === 'slot') return [node]
    if (node.type === 'field') {
      if (!isShown(node.node, indexes)) return []
      if (node.node.role !== 'group') return [node]
    }
    const children = shownNodes(node.children, indexes, isShown)
    if (hasValues(node.children) && !hasValues(children)) return []
    const same =
      children.length === node.children.length &&
      children.every((child, i) => child === node.children[i])
    return same ? [node] : [{ ...node, children }]
  })
}

/** True when a field with a value is among the nodes, at any depth. */
function hasValues(nodes: readonly LayoutNode[]): boolean {
  return nodes.some((node) => {
    if (node.type === 'slot') return false
    if (node.type === 'field' && node.node.role !== 'display') return true
    return hasValues(node.children)
  })
}
