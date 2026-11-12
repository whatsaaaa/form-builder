import {
  type JsonField,
  type LayoutNode,
  type LayoutStep,
  toFieldPath,
  type VisibilityState,
} from '@whatsaaaa/form-builder-schema'

/** One answer: a field's label, and its value as text. */
export interface ReviewRow {
  /** The field's path, joined with dots: a key for renderers. */
  key: string
  label: string
  value: string
}

/**
 * The answers of a step as text, in layout order, without the fields
 * that conditions hide. `input` is what Formisch's `getInput` gives.
 */
export function reviewOf(
  step: LayoutStep,
  input: unknown,
  visibility: VisibilityState,
): ReviewRow[] {
  function rows(
    nodes: readonly LayoutNode[],
    indexes: readonly number[],
    item?: string,
  ): ReviewRow[] {
    return visibility.shownNodes(nodes, indexes).flatMap((node) => {
      if (node.type === 'slot') return []
      // A section, a row and a group show through their fields.
      if (node.type !== 'field' || node.node.role === 'group') {
        return rows(node.children, indexes, item)
      }
      const { field, role, dataPath } = node.node
      if (role === 'display') return []
      const path = toFieldPath(dataPath, indexes)
      const value = valueAt(input, path)
      // In a list, the label starts with the item: "Guest 2: Name".
      const label = [item, field.label ?? field.name]
        .filter(Boolean)
        .join(': ')
      if (role === 'array') {
        const items = Array.isArray(value) ? value : []
        return items.flatMap((_, index) =>
          rows(node.children, [...indexes, index], `${label} ${index + 1}`),
        )
      }
      return [{ key: path.join('.'), label, value: textOf(field, value) }]
    })
  }
  return rows(step.children, [])
}

function valueAt(input: unknown, path: readonly (string | number)[]) {
  return path.reduce<unknown>(
    (value, key) =>
      typeof value === 'object' && value !== null
        ? (value as Record<string | number, unknown>)[key]
        : undefined,
    input,
  )
}

/** A value as text: the label of an option, the name of a file. */
function textOf(field: JsonField, value: unknown): string {
  if (field.type === 'checkbox') return value === true ? 'Yes' : 'No'
  const values = (Array.isArray(value) ? value : [value]).filter(
    (each) => each !== undefined && each !== '',
  )
  if (values.length === 0) return 'Not answered'
  // Never show a password.
  if (field.type === 'password') return '••••••••'
  const options = (field.options ?? []) as {
    value: unknown
    label: string
  }[]
  return values
    .map((each) =>
      each instanceof File
        ? each.name
        : (options.find((option) => option.value === each)?.label ??
          String(each)),
    )
    .join(', ')
}
