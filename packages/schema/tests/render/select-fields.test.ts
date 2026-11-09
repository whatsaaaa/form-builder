import { describe, expect, it } from 'vitest'
import {
  allFields,
  createSchemaBuilder,
  type FieldNode,
  selectFields,
} from '@whatsaaaa/form-builder-schema'
import { form } from '../helpers'

const fields = createSchemaBuilder().getFieldTree(
  form(
    { type: 'heading', text: 'Sign up' },
    { name: 'name', type: 'text' },
    { name: 'email', type: 'email' },
    {
      name: 'address',
      type: 'group',
      fields: [
        { name: 'street', type: 'text' },
        { name: 'city', type: 'text' },
      ],
    },
    {
      name: 'lines',
      type: 'array',
      fields: [
        { name: 'product', type: 'text' },
        { name: 'qty', type: 'number' },
      ],
    },
    { name: 'newsletter', type: 'checkbox' },
  ),
)

/** Every field of the tree as its dot path, or its type for a display element, in order. */
const paths = (nodes: readonly FieldNode[]) =>
  [...allFields(nodes)].map((node) => node.dataPath.join('.') || node.type)

describe('selectFields', () => {
  it('gives every field without options', () => {
    expect(selectFields(fields)).toEqual(fields)
    expect(selectFields(fields)).not.toBe(fields)
  })

  it('leaves out the fields `except` names, with the fields inside them', () => {
    expect(paths(selectFields(fields, { except: ['email', 'address', 'newsletter'] }))).toEqual([
      'heading',
      'name',
      'lines',
      'lines.*.product',
      'lines.*.qty',
    ])
  })

  it('leaves out a field of a group, and keeps the group', () => {
    const selected = selectFields(fields, { except: ['address.city'] })

    expect(paths(selected)).toContain('address.street')
    expect(paths(selected)).not.toContain('address.city')
    // The definition's tree is left as it was.
    expect(paths(fields)).toContain('address.city')
  })

  it("leaves a field out of every item of an array with '*' in its path", () => {
    expect(paths(selectFields(fields, { only: ['lines'], except: ['lines.*.qty'] }))).toEqual([
      'lines',
      'lines.*.product',
    ])
  })

  it('gives only the fields `only` names, in the order of the definition', () => {
    const selected = selectFields(fields, { only: ['newsletter', 'name', 'address.city'] })

    expect(paths(selected)).toEqual(['name', 'address.city', 'newsletter'])
  })

  it('gives a group or an array `only` names with the fields inside it', () => {
    expect(paths(selectFields(fields, { only: ['address'] }))).toEqual([
      'address',
      'address.street',
      'address.city',
    ])
  })

  it('throws a TypeError for a path that names no field', () => {
    expect(() => selectFields(fields, { except: ['emial'] })).toThrow(
      new TypeError('No field at "emial" in the definition.'),
    )
    expect(() => selectFields(fields, { only: ['emial'] })).toThrow(TypeError)
  })

  it("throws a TypeError for a field of an array's items in `only`", () => {
    expect(() => selectFields(fields, { only: ['lines.*.qty'] })).toThrow(
      `"lines.*.qty" is in an array's items, so it can't be placed on its own. Place "lines" instead.`,
    )
  })
})
