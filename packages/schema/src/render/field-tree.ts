import type { JsonField } from '../definition/json-form'
import type { WalkedField } from '../definition/walked-field'
import type { DefinitionPath } from '../errors/definition-error'
import type { ValueKind } from '../shared/value-kind'

/**
 * How a renderer shows a field: a `value` field has an input, a `group` or an `array` holds
 * fields, and a `display` element, like a heading, has no value.
 */
export type FieldRole = 'value' | 'group' | 'array' | 'display'

/** One field of a definition, with the fields inside it when it is a container. */
export interface FieldNode {
  readonly field: JsonField
  /** The field's type, e.g. `'text'`. */
  readonly type: string
  readonly role: FieldRole
  /** The kind of the field's value, e.g. `'number'`, or `'none'` for a display element. */
  readonly kind: ValueKind
  /** The kind of the items, for a field of kind `array` whose type has one. */
  readonly itemKind: ValueKind | undefined
  /** Where the value is, with `'*'` for each array index: `['lines', '*', 'quantity']`. */
  readonly dataPath: readonly (string | number)[]
  /**
   * Where the field is in the definition: `['fields', 1, 'fields', 0]`, or in the layout for a
   * display element written there. Unique in a definition, so it names any field, display elements
   * included.
   */
  readonly definitionPath: DefinitionPath
  /** The fields of a group, or of one item of an array. */
  readonly children: readonly FieldNode[]
}

/**
 * The walked fields of a definition without issues, as a tree. `isContainer` tells the types
 * whose value holds other fields, your own ones included.
 */
export function fieldTree(
  walked: Iterable<WalkedField>,
  isContainer: (type: string) => boolean,
): FieldNode[] {
  const roots: FieldNode[] = []
  // The list each depth adds its fields to. A container comes before its fields, so the list at a
  // field's depth is the one its parent opened.
  const lists: FieldNode[][] = [roots]
  for (const field of walked) {
    const children: FieldNode[] = []
    lists.length = field.depth + 1
    lists.at(-1)?.push(toNode(field, isContainer(field.type), children))
    lists.push(children)
  }
  return roots
}

function toNode(walked: WalkedField, container: boolean, children: FieldNode[]): FieldNode {
  // The definition has no issues, so the builder gave every field its kind.
  const kind = walked.kind as ValueKind
  return {
    field: walked.field,
    type: walked.type,
    role: roleOf(kind, container),
    kind,
    itemKind: walked.itemKind,
    dataPath: walked.dataPath,
    definitionPath: walked.definitionPath,
    children,
  }
}

function roleOf(kind: ValueKind, container: boolean): FieldRole {
  if (kind === 'none') return 'display'
  if (!container) return 'value'
  return kind === 'array' ? 'array' : 'group'
}
