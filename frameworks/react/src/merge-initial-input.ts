import type { FieldNode, JsonForm, SchemaBuilder } from '@whatsaaaa/form-builder-schema'

/**
 * Formisch's `initialInput` for a definition: the builder's, or with the `initialInput` of the
 * options, the definition's defaults with it over them. A key that is there wins over the field's
 * default, with any value, so a field given `undefined` starts blank. The fields of a group are
 * merged the same way, and a list is taken whole, each item over what a new item starts with.
 * Then the fields the conditions clear for that input are blank, as in the builder's own.
 */
export function mergeInitialInput(
  builder: SchemaBuilder,
  definition: JsonForm,
  given: unknown,
): Record<string, unknown> {
  if (!isRecord(given)) return builder.getInitialInput(definition)
  // The builder's own input has the fields blank that the defaults hide, which `given` may show.
  const input = mergeFields(builder.getFieldTree(definition), given)
  return builder.getVisibility(definition).clear(input)
}

/**
 * The input of a list of fields: `given`, with the default of each field it has no key for, as
 * the builder's `getInitialInput` gives them. Anything but an object leaves every field blank.
 */
function mergeFields(nodes: readonly FieldNode[], given: unknown): Record<string, unknown> {
  if (!isRecord(given)) return {}
  // A key that is no field stays: Formisch reads only the keys of the schema.
  const input = { ...given }
  for (const node of nodes) {
    if (node.role === 'display') continue
    const key = node.dataPath.at(-1) as string
    if (Object.hasOwn(given, key)) {
      input[key] = mergeField(node, given[key])
    } else {
      const value = defaultOf(node)
      if (value !== undefined) input[key] = value
    }
  }
  return input
}

function mergeField(node: FieldNode, given: unknown): unknown {
  if (node.role === 'group') return mergeFields(node.children, given)
  if (node.role !== 'array') return given
  // Formisch would read a string as a list of its characters.
  if (!Array.isArray(given)) return []
  // The field of a list of single values is where its items are, and has no key of its own.
  const of = node.children.find(
    (child) => child.role !== 'display' && child.dataPath.length === node.dataPath.length + 1,
  )
  return given.map((item: unknown) =>
    of ? mergeField(of, item) : mergeFields(node.children, item),
  )
}

function defaultOf(node: FieldNode): unknown {
  if (node.role === 'group') return mergeFields(node.children, {})
  return node.role === 'array' ? (node.field.default ?? []) : node.field.default
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null
