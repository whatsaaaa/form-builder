import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import {
  createSchemaBuilder,
  defineFieldType,
  getInitialInput,
  type JsonField,
  type JsonForm,
  walkFields,
  type WalkedField,
} from '@whatsaaaa/form-builder-schema'
import { fixtures } from '../fixtures'
import { form } from '../helpers'

// Child fields are checked by the builder, so the props accept anything for them.
const childField = v.custom<JsonField>(() => true)

// Consumer containers, built the way the built-in group and array types are.
const section = defineFieldType({
  kind: 'object',
  container: true,
  props: v.object({ fields: v.array(childField) }),
  schema: (field, ctx) => ctx.buildFields(field.fields, [...ctx.path, 'fields']),
})

const list = defineFieldType({
  kind: 'array',
  container: true,
  props: v.object({ of: childField }),
  schema: (field, ctx) => v.array(ctx.buildField(field.of, [...ctx.path, 'of'])),
})

const builder = createSchemaBuilder({ fieldTypes: { section, list } })

const walk = (json: JsonForm) =>
  [...builder.walkFields(json)].map(({ type, dataPath, definitionPath, depth }) => ({
    type,
    dataPath,
    definitionPath,
    depth,
  }))

// What the walkFields function yields too: everything but the kinds.
const withoutKinds = (walked: WalkedField) =>
  Object.fromEntries(Object.entries(walked).filter(([key]) => key !== 'kind' && key !== 'itemKind'))

const kinds = (json: JsonForm) =>
  [...builder.walkFields(json)].map(({ type, kind, itemKind }) => ({ type, kind, itemKind }))

describe("the builder's walkFields", () => {
  it.each(Object.entries(fixtures))('yields what walkFields does for the %s fixture', (_, json) => {
    const definition = json as JsonForm

    expect([...builder.walkFields(definition)].map(withoutKinds)).toEqual([
      ...walkFields(definition),
    ])
  })

  it.each(Object.entries(fixtures))('gives every field of the %s fixture a kind', (_, json) => {
    for (const { kind } of builder.walkFields(json as JsonForm)) expect(kind).toBeTypeOf('string')
  })

  it('gives each field its kind, and the kind of its items', () => {
    const json = form(
      { type: 'heading', text: 'Order' },
      { name: 'qty', type: 'number' },
      { name: 'size', type: 'select', options: [{ value: 1, label: 'S' }] },
      { name: 'photos', type: 'file', multiple: true },
      { name: 'colors', type: 'multiselect', options: [{ value: 'red', label: 'Red' }] },
      { name: 'tags', type: 'list', of: { type: 'text' } },
    )

    expect(kinds(json)).toEqual([
      { type: 'heading', kind: 'none' },
      { type: 'number', kind: 'number' },
      { type: 'select', kind: 'number' },
      { type: 'file', kind: 'array', itemKind: 'file' },
      { type: 'multiselect', kind: 'array', itemKind: 'string' },
      { type: 'list', kind: 'array' },
      { type: 'text', kind: 'string' },
    ])
  })

  it('leaves out the kinds of a field with issues, but not of a display element', () => {
    const json = form(
      { name: 'a', type: 'number', rules: [{ rule: 'nope' }] },
      { type: 'heading', text: 'Hi', rules: [] },
    )

    expect(builder.validate(json).success).toBe(false)
    expect(kinds(json)).toEqual([
      { type: 'number', kind: undefined },
      { type: 'heading', kind: 'none' },
    ])
  })

  it('has no kinds from the walkFields function', () => {
    const [field] = walkFields(form({ name: 'a', type: 'number' }))

    expect(field).not.toHaveProperty('kind')
    expect(field).not.toHaveProperty('itemKind')
  })

  it("gives a display element its parent's path, even with a name", () => {
    const json = form(
      { type: 'heading', name: 'email', text: 'Contact' },
      { name: 'email', type: 'email' },
      { name: 'address', type: 'group', fields: [{ type: 'divider', name: 'city' }] },
    )
    const paths = (walked: Iterable<WalkedField>) =>
      [...walked].map(({ type, dataPath }) => [type, dataPath])
    const expected = [
      ['heading', []],
      ['email', ['email']],
      ['group', ['address']],
      ['divider', ['address']],
    ]

    expect(paths(builder.walkFields(json))).toEqual(expected)
    expect(paths(walkFields(json))).toEqual(expected)
  })

  it('walks into your own container types', () => {
    const json = form(
      {
        name: 'person',
        type: 'section',
        fields: [
          { type: 'heading', text: 'Name' },
          { name: 'first', type: 'text' },
        ],
      },
      { name: 'tags', type: 'list', of: { type: 'text' } },
    )

    expect(walk(json)).toEqual([
      { type: 'section', dataPath: ['person'], definitionPath: ['fields', 0], depth: 0 },
      {
        type: 'heading',
        dataPath: ['person'],
        definitionPath: ['fields', 0, 'fields', 0],
        depth: 1,
      },
      {
        type: 'text',
        dataPath: ['person', 'first'],
        definitionPath: ['fields', 0, 'fields', 1],
        depth: 1,
      },
      { type: 'list', dataPath: ['tags'], definitionPath: ['fields', 1], depth: 0 },
      { type: 'text', dataPath: ['tags', '*'], definitionPath: ['fields', 1, 'of'], depth: 1 },
    ])
  })

  it('yields a field with issues, but not the fields inside it', () => {
    const json = form(
      { name: 'a', type: 'nope' },
      { name: 's', type: 'section', required: true, fields: [{ name: 'b', type: 'text' }] },
    )

    expect(builder.validate(json).success).toBe(false)
    expect(walk(json).map((field) => field.dataPath)).toEqual([['a'], ['s']])
  })

  it('yields nothing for a definition it cannot read', () => {
    expect([...builder.walkFields({ version: '1', fields: null } as never)]).toEqual([])
  })

  it('skips what is not shaped like a field', () => {
    const json = { version: '1', fields: ['text', { name: 'a' }, { name: 'b', type: 'text' }] }

    expect(walk(json as never).map((field) => field.dataPath)).toEqual([['b']])
  })
})

describe("the builder's getInitialInput", () => {
  it.each(Object.entries(fixtures))(
    'gives what getInitialInput does for the %s fixture',
    (_, json) => {
      const definition = json as JsonForm

      expect(builder.getInitialInput(definition)).toEqual(getInitialInput(definition))
    },
  )

  it('nests your own container types', () => {
    const json = form(
      {
        name: 'person',
        type: 'section',
        fields: [
          { name: 'first', type: 'text', default: 'Ana' },
          { name: 'last', type: 'text' },
        ],
      },
      { name: 'tags', type: 'list', of: { type: 'text' } },
      { name: 'picked', type: 'list', of: { type: 'text' }, default: ['a'] },
    )

    expect(builder.getInitialInput(json)).toEqual({
      person: { first: 'Ana' },
      tags: [],
      picked: ['a'],
    })
  })

  it('leaves out a field with issues', () => {
    const json = form(
      { name: 'a', type: 'text', default: 'x', rules: [{ rule: 'nope' }] },
      { name: 'b', type: 'text', default: 'y' },
    )

    expect(builder.getInitialInput(json)).toEqual({ b: 'y' })
  })

  it('gives {} for a container of kind object that builds no list of fields', () => {
    const card = defineFieldType({
      kind: 'object',
      container: true,
      props: v.object({ of: childField }),
      schema: (field, ctx) => v.object({ value: ctx.buildField(field.of, [...ctx.path, 'of']) }),
    })
    const { getInitialInput } = createSchemaBuilder({ fieldTypes: { card } })

    expect(getInitialInput(form({ name: 'c', type: 'card', of: { type: 'text' } }))).toEqual({
      c: {},
    })
  })
})
