import type {
  JsonField,
  JsonForm,
  SchemaBuilder,
  ValueKind,
  WalkedField,
} from '@whatsaaaa/form-builder-schema'

/**
 * How `<JsonFields>` renders a field: a `value` field has an input, a `group` or an `array` holds
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
  /** The fields of a group, or of one item of an array. */
  readonly children: readonly FieldNode[]
}

/**
 * The fields of a definition that builds, as a tree. It comes from the builder's `walkFields`, so
 * your own container types are in it too.
 */
export function fieldTree(builder: SchemaBuilder, definition: JsonForm): FieldNode[] {
  const roots: FieldNode[] = []
  // The list each depth adds its fields to. A container comes before its fields, so the list at a
  // field's depth is the one its parent opened.
  const lists: FieldNode[][] = [roots]
  for (const walked of builder.walkFields(definition)) {
    const children: FieldNode[] = []
    lists.length = walked.depth + 1
    lists.at(-1)?.push(toNode(walked, builder, children))
    lists.push(children)
  }
  return roots
}

function toNode(walked: WalkedField, builder: SchemaBuilder, children: FieldNode[]): FieldNode {
  // The definition builds, so the builder gave every field its kind.
  const kind = walked.kind as ValueKind
  return {
    field: walked.field,
    type: walked.type,
    role: roleOf(kind, builder.fieldTypes[walked.type]?.container === true),
    kind,
    itemKind: walked.itemKind,
    dataPath: walked.dataPath,
    children,
  }
}

function roleOf(kind: ValueKind, container: boolean): FieldRole {
  if (kind === 'none') return 'display'
  if (!container) return 'value'
  return kind === 'array' ? 'array' : 'group'
}
