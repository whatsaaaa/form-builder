import { describe, expect, it } from 'vitest'
import {
  allFields,
  createSchemaBuilder,
  dotPathOf,
  findField,
} from '@whatsaaaa/form-builder-schema'
import { form } from '../helpers'

const fields = createSchemaBuilder().getFieldTree(
  form(
    { type: 'heading', text: 'Sign up' },
    { name: 'email', type: 'email' },
    {
      name: 'address',
      type: 'group',
      fields: [
        { name: 'street', type: 'text' },
        { name: 'city', type: 'text' },
      ],
    },
    { name: 'lines', type: 'array', fields: [{ name: 'qty', type: 'number' }] },
    { name: 'tags', type: 'array', of: { type: 'text' } },
  ),
)

describe('allFields', () => {
  it('gives every field in document order, a container before its fields', () => {
    expect([...allFields(fields)].map((node) => node.dataPath.join('.') || node.type)).toEqual([
      'heading',
      'email',
      'address',
      'address.street',
      'address.city',
      'lines',
      'lines.*.qty',
      'tags',
      'tags.*',
    ])
  })
})

describe('dotPathOf', () => {
  it("joins the data path with dots, with '*' for the items of an array", () => {
    expect([...allFields(fields)].map(dotPathOf)).toEqual([
      undefined,
      'email',
      'address',
      'address.street',
      'address.city',
      'lines',
      'lines.*.qty',
      'tags',
      // The field of a list of single values has no name, like the heading: it is the item.
      undefined,
    ])
  })
})

describe('findField', () => {
  it('finds a field at any depth by its dot path', () => {
    expect(findField(fields, 'email').field.name).toBe('email')
    expect(findField(fields, 'address.city').dataPath).toEqual(['address', 'city'])
    expect(findField(fields, 'lines.*.qty').dataPath).toEqual(['lines', '*', 'qty'])
  })

  it('finds a group or an array with the fields inside it', () => {
    expect(findField(fields, 'address', { placed: true }).children).toHaveLength(2)
    expect(findField(fields, 'lines', { placed: true }).role).toBe('array')
  })

  it('throws a TypeError for a path that names no field', () => {
    const typo = () => findField(fields, 'emial')

    expect(typo).toThrow(TypeError)
    expect(typo).toThrow('No field at "emial" in the definition.')
  })

  it("throws a TypeError for a field of an array's items that is placed on its own", () => {
    expect(() => findField(fields, 'lines.*.qty', { placed: true })).toThrow(
      `"lines.*.qty" is in an array's items, so it can't be placed on its own. Place "lines" instead.`,
    )
  })
})
