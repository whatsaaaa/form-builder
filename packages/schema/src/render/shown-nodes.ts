import type { FieldNode } from './field-tree'
import type { LayoutNode, LayoutSection } from './form-layout'

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
  return shownNodesWith(nodes, indexes, {
    isShown,
    isSectionHidden: () => false,
    counts: () => false,
  })
}

/** What `shownNodesWith` asks about the nodes. */
export interface ShownRules {
  /** False for a field, or a display element, that drops out. */
  readonly isShown: IsFieldShown
  /** True for a section that is hidden itself, with everything in it. */
  isSectionHidden(section: LayoutSection, indexes: readonly number[]): boolean
  /**
   * True for a display element or a section that counts like a field with a value: a container
   * of it stays while it is shown, and drops out when it and the fields are all hidden.
   */
  counts(node: FieldNode | LayoutSection): boolean
}

/** `shownNodes`, with sections that can hide, and display elements and sections that count. */
export function shownNodesWith(
  nodes: readonly LayoutNode[],
  indexes: readonly number[],
  rules: ShownRules,
): LayoutNode[] {
  return nodes.flatMap((node): LayoutNode[] => {
    if (node.type === 'slot') return [node]
    if (node.type === 'field') {
      if (!rules.isShown(node.node, indexes)) return []
      if (node.node.role !== 'group') return [node]
    }
    if (node.type === 'section' && rules.isSectionHidden(node, indexes)) return []
    const children = shownNodesWith(node.children, indexes, rules)
    if (hasCounting(node.children, rules) && !hasCounting(children, rules)) return []
    const same =
      children.length === node.children.length &&
      children.every((child, i) => child === node.children[i])
    return same ? [node] : [{ ...node, children }]
  })
}

/** True when a field with a value, or a node that counts like one, is among the nodes. */
export function hasCounting(nodes: readonly LayoutNode[], rules: ShownRules): boolean {
  return nodes.some((node) => {
    if (node.type === 'slot') return false
    if (node.type === 'field' && (node.node.role !== 'display' || rules.counts(node.node))) {
      return true
    }
    if (node.type === 'section' && rules.counts(node)) return true
    return hasCounting(node.children, rules)
  })
}
