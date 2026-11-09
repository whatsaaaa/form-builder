import { describe, expect, it } from 'vitest'
import {
  createSchemaBuilder,
  getInitialInput,
  type JsonForm,
  walkFields,
} from '@whatsaaaa/form-builder-schema'
import array from '../../../../fixtures/field-types/array.json'
import group from '../../../../fixtures/field-types/group.json'
import { form } from '../helpers'

// The two nested fixtures in one definition.
const nested = { version: '1', fields: [...group.fields, ...array.fields] } as JsonForm

const walk = (json: JsonForm) =>
  [...walkFields(json)].map(({ type, dataPath, definitionPath, depth }) => ({
    type,
    dataPath,
    definitionPath,
    depth,
  }))

describe('walkFields', () => {
  it('yields every field of a nested definition, parents first', () => {
    expect(walk(nested)).toEqual([
      { type: 'group', dataPath: ['address'], definitionPath: ['fields', 0], depth: 0 },
      {
        type: 'text',
        dataPath: ['address', 'street'],
        definitionPath: ['fields', 0, 'fields', 0],
        depth: 1,
      },
      {
        type: 'text',
        dataPath: ['address', 'city'],
        definitionPath: ['fields', 0, 'fields', 1],
        depth: 1,
      },
      {
        type: 'text',
        dataPath: ['address', 'zip'],
        definitionPath: ['fields', 0, 'fields', 2],
        depth: 1,
      },
      {
        type: 'select',
        dataPath: ['address', 'country'],
        definitionPath: ['fields', 0, 'fields', 3],
        depth: 1,
      },
      { type: 'array', dataPath: ['tags'], definitionPath: ['fields', 1], depth: 0 },
      { type: 'text', dataPath: ['tags', '*'], definitionPath: ['fields', 1, 'of'], depth: 1 },
      { type: 'array', dataPath: ['lines'], definitionPath: ['fields', 2], depth: 0 },
      {
        type: 'text',
        dataPath: ['lines', '*', 'product'],
        definitionPath: ['fields', 2, 'fields', 0],
        depth: 1,
      },
      {
        type: 'number',
        dataPath: ['lines', '*', 'quantity'],
        definitionPath: ['fields', 2, 'fields', 1],
        depth: 1,
      },
    ])
  })

  it("gives a field without a name its parent's data path", () => {
    const json = form({
      name: 'address',
      type: 'group',
      fields: [{ type: 'heading', text: 'Address' }],
    })

    expect(walk(json)[1]).toEqual({
      type: 'heading',
      dataPath: ['address'],
      definitionPath: ['fields', 0, 'fields', 0],
      depth: 1,
    })
  })

  it('walks into the item field of an array', () => {
    const json = form({
      name: 'people',
      type: 'array',
      of: { type: 'group', fields: [{ name: 'name', type: 'text' }] },
    })

    expect(walk(json).map((field) => field.dataPath)).toEqual([
      ['people'],
      ['people', '*'],
      ['people', '*', 'name'],
    ])
  })

  it('walks into the built-in group and array types only', () => {
    const json = form({ name: 's', type: 'section', fields: [{ name: 'a', type: 'text' }] })

    expect(walk(json).map((field) => field.type)).toEqual(['section'])
  })

  it('leaves out display elements, like the builder', () => {
    const json = form({ name: 'intro', type: 'heading', text: 'Hi', default: 'x' })

    expect(getInitialInput(json)).toEqual({})
    expect(createSchemaBuilder().getInitialInput(json)).toEqual({})
  })

  it('reads a group or array without child fields as empty', () => {
    const json = form({ name: 'g', type: 'group' }, { name: 'l', type: 'array' })

    expect(walk(json).map((field) => field.type)).toEqual(['group', 'array'])
    expect(getInitialInput(json)).toEqual({ g: {}, l: [] })
  })
})

describe('getInitialInput', () => {
  it('nests defaults and gives [] for an array without a default', () => {
    expect(getInitialInput(nested)).toEqual({
      address: { country: 'rs' },
      tags: ['new'],
      lines: [],
    })
  })

  it('leaves out fields without a default and fields without a name', () => {
    const json = form(
      { type: 'heading', text: 'Order' },
      { name: 'note', type: 'text' },
      { name: 'seats', type: 'number', default: 2 },
      { name: 'empty', type: 'group', fields: [{ name: 'a', type: 'text' }] },
    )

    expect(getInitialInput(json)).toEqual({ seats: 2, empty: {} })
  })
})
