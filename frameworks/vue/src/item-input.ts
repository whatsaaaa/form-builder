import type { JsonField, SchemaBuilder } from '@whatsaaaa/form-builder-schema'
import type { FieldNode } from './field-tree'

/**
 * The input of a new item of an array, from the defaults in the definition: an object of its
 * fields' input, or the input of the item field for a list of single values.
 */
export function itemInput(builder: SchemaBuilder, array: FieldNode): unknown {
  const fields = array.children.map((child) => child.field)
  const [only] = array.children
  // The field of a list of single values has no name: its value is the item itself.
  if (array.children.length === 1 && only?.role !== 'display' && only?.dataPath.at(-1) === '*') {
    return initialInput(builder, [{ ...only.field, name: 'item' }]).item
  }
  return initialInput(builder, fields)
}

const initialInput = (builder: SchemaBuilder, fields: JsonField[]) =>
  builder.getInitialInput({ version: '1', fields })
