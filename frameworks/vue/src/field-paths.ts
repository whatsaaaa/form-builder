import type { FieldNode } from './field-tree'

/**
 * A field's path as `only`, `except` and `<JsonField>` name it: `'address.city'`, or
 * `'lines.*.quantity'` for a field of an array's items. Undefined for a field without a name.
 */
export const pathOf = (node: FieldNode): string | undefined =>
  node.field.name === undefined ? undefined : node.dataPath.join('.')

/** Every field of the tree, in document order, a container before its fields. */
export function* allFields(nodes: readonly FieldNode[]): Generator<FieldNode, void, undefined> {
  for (const node of nodes) {
    yield node
    yield* allFields(node.children)
  }
}

/**
 * The field at `path`. A path that names no field is a mistake in the code, so it throws. With
 * `placed`, the field is rendered on its own, which a field of an array's items can't be: it has no
 * index outside its item.
 */
export function findField(nodes: readonly FieldNode[], path: string, placed: boolean): FieldNode {
  const node = [...allFields(nodes)].find((candidate) => pathOf(candidate) === path)
  if (!node) throw new TypeError(`No field at "${path}" in the definition.`)
  if (placed && node.dataPath.includes('*')) {
    const array = path.slice(0, path.indexOf('.*'))
    throw new TypeError(
      `"${path}" is in an array's items, so it can't be placed on its own. Place "${array}" instead.`,
    )
  }
  return node
}
