import { describe, expect, it } from 'vitest'
import {
  allFields,
  createSchemaBuilder,
  dotPathOf,
  findField,
  selectFields,
} from '@whatsaaaa/form-builder-schema'
import { form } from '../helpers'

const builder = createSchemaBuilder()

const fields = builder.getFieldTree(
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

// A display element needs no name, but may have one. Its name is no key of the value.
describe('a display element with a name', () => {
  const json = form(
    { type: 'heading', name: 'email', text: 'Contact' },
    { name: 'email', type: 'email' },
    {
      name: 'address',
      type: 'group',
      fields: [
        { type: 'paragraph', name: 'city', text: 'Where to' },
        { name: 'city', type: 'text' },
      ],
    },
  )
  const named = builder.getFieldTree(json)

  it('is valid, as it was before', () => {
    expect(builder.validate(json)).toEqual({ success: true, issues: [] })
  })

  it("has its parent's data path and no dot path", () => {
    expect(
      [...allFields(named)].map((node) => [node.type, node.dataPath, dotPathOf(node)]),
    ).toEqual([
      ['heading', [], undefined],
      ['email', ['email'], 'email'],
      ['group', ['address'], 'address'],
      ['paragraph', ['address'], undefined],
      ['text', ['address', 'city'], 'address.city'],
    ])
  })

  it('is never the field at the dot path of its name', () => {
    expect(findField(named, 'email').type).toBe('email')
    expect(findField(named, 'address.city').type).toBe('text')
  })

  it('stays when `except` leaves out the field of its name', () => {
    const rest = selectFields(named, { except: ['email', 'address.city'] })

    expect([...allFields(rest)].map((node) => node.type)).toEqual(['heading', 'group', 'paragraph'])
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
