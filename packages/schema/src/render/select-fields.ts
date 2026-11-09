import type { FieldNode } from './field-tree'
import { allFields, dotPathOf, findField } from './find-field'

export interface SelectFieldsOptions {
  /**
   * Only these fields, by dot path, in the order of the definition. A display element has no path,
   * so it is left out.
   */
  only?: readonly string[]
  /**
   * Leaves out these fields, by dot path, at any depth, e.g. the ones you render somewhere else.
   * `'lines.*.note'` leaves a field out of every item of an array.
   */
  except?: readonly string[]
}

/**
 * The fields to render when code picks some by dot path, as a tree like the builder's
 * `getFieldTree` gives: the fields `only` names, in the order of the definition, without the ones
 * `except` names. A group or an array comes with its fields. A path that names no field is a
 * mistake in the code, so it throws a `TypeError`, and so does a field of an array's items in
 * `only`, which has no index outside its item.
 */
export function selectFields(
  fields: readonly FieldNode[],
  options: SelectFieldsOptions = {},
): FieldNode[] {
  const except = new Set(options.except)
  // A path that names no field is a typo, so check them even though nothing uses the result.
  for (const path of except) findField(fields, path)

  const picked = options.only ? onlyFields(fields, options.only) : fields
  return except.size ? without(picked, except) : [...picked]
}

/** The fields `only` names, in the order of the definition, each once. */
function onlyFields(fields: readonly FieldNode[], only: readonly string[]): FieldNode[] {
  const named = new Set(only.map((path) => findField(fields, path, { placed: true })))
  return [...allFields(fields)].filter((node) => named.has(node))
}

/** The nodes, and the fields inside them, whose dot path isn't in `except`. */
function without(nodes: readonly FieldNode[], except: ReadonlySet<string>): FieldNode[] {
  return nodes
    .filter((node) => !except.has(dotPathOf(node) ?? ''))
    .map((node) =>
      node.children.length ? { ...node, children: without(node.children, except) } : node,
    )
}
