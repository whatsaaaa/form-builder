import type { FieldNode } from './field-tree'
import { allFields } from './find-field'

/**
 * Throws a `TypeError` when a field of the tree, at any depth, has a type that `components` has no
 * entry for, naming each such type once. A renderer that takes a component per field type checks
 * the fields it renders before it renders them, so a missing component shows up at once rather
 * than when its field first appears, like in a new array item.
 */
export function checkComponents(
  nodes: readonly FieldNode[],
  components: Readonly<Record<string, unknown>>,
): void {
  const missing = new Set<string>()
  for (const node of allFields(nodes)) {
    if (!Object.hasOwn(components, node.type)) missing.add(node.type)
  }
  if (!missing.size) return

  // A missing component is a mistake in the code, not in the definition, so it throws early.
  const names = [...missing].map((type) => `"${type}"`).join(', ')
  const [noun, pronoun] = missing.size > 1 ? ['types', 'them'] : ['type', 'it']
  throw new TypeError(
    `No component for the field ${noun} ${names}. Add ${pronoun} to the components.`,
  )
}
