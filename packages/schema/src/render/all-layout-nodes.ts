import type { LayoutNode } from './form-layout'

/** Every node of a layout tree, in layout order, a container before its items. */
export function* allLayoutNodes(
  nodes: readonly LayoutNode[],
): Generator<LayoutNode, void, undefined> {
  for (const node of nodes) {
    yield node
    if (node.type !== 'slot') yield* allLayoutNodes(node.children)
  }
}
