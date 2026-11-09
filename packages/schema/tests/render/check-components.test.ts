import { describe, expect, it } from 'vitest'
import { checkComponents, createSchemaBuilder } from '@whatsaaaa/form-builder-schema'
import { form } from '../helpers'

const fields = createSchemaBuilder().getFieldTree(
  form(
    { name: 'a', type: 'text' },
    { name: 'b', type: 'number' },
    { name: 'c', type: 'group', fields: [{ name: 'd', type: 'email' }] },
    { name: 'e', type: 'array', of: { type: 'number' } },
  ),
)

describe('checkComponents', () => {
  it('passes when every type in the tree has a component', () => {
    const components = { text: 'Text', number: 'Number', group: 'Group', email: 'Email', array: 0 }

    expect(() => checkComponents(fields, components)).not.toThrow()
  })

  it('throws a TypeError that names every type without a component once, at any depth', () => {
    const check = () => checkComponents(fields, { text: 'Text' })

    expect(check).toThrow(TypeError)
    expect(check).toThrow(
      'No component for the field types "number", "group", "email", "array". Add them to the components.',
    )
  })

  it('names a single missing type in the singular', () => {
    expect(() => checkComponents(fields.slice(1, 2), {})).toThrow(
      'No component for the field type "number". Add it to the components.',
    )
  })

  it('checks only the fields it gets', () => {
    expect(() => checkComponents(fields.slice(0, 1), { text: 'Text' })).not.toThrow()
  })

  it("doesn't count what an object inherits as a component", () => {
    const tree = createSchemaBuilder().getFieldTree(form({ name: 'a', type: 'text' }))

    expect(() => checkComponents(tree, Object.create({ text: 'Text' }))).toThrow(
      'No component for the field type "text"',
    )
  })
})
