import type { FieldNode } from './field-tree'

/**
 * A field's dot path, the way code names a field to place it: `'address.city'`, or
 * `'lines.*.quantity'` for a field of an array's items. Undefined for a display element, even one
 * with a name, and for the field of a list of single values, whose value is the item itself.
 */
export const dotPathOf = (node: FieldNode): string | undefined =>
  node.role === 'display' || node.field.name === undefined ? undefined : node.dataPath.join('.')

/** Every field of the tree, in document order, a container before its fields. */
export function* allFields(nodes: readonly FieldNode[]): Generator<FieldNode, void, undefined> {
  for (const node of nodes) {
    yield node
    yield* allFields(node.children)
  }
}

export interface FindFieldOptions {
  /**
   * True when the field is rendered on its own, away from its container. A field of an array's
   * items can't be: it has no index outside its item, so it throws.
   */
  placed?: boolean
}

/** The field at a dot path. A path that names no field is a mistake in the code, so it throws. */
export function findField(
  nodes: readonly FieldNode[],
  path: string,
  options: FindFieldOptions = {},
): FieldNode {
  const node = [...allFields(nodes)].find((candidate) => dotPathOf(candidate) === path)
  if (!node) throw new TypeError(`No field at "${path}" in the definition.`)
  if (options.placed && node.dataPath.includes('*')) {
    const array = path.slice(0, path.indexOf('.*'))
    throw new TypeError(
      `"${path}" is in an array's items, so it can't be placed on its own. Place "${array}" instead.`,
    )
  }
  return node
}
