import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import {
  createSchemaBuilder,
  defineFieldType,
  getInitialInput,
  type JsonField,
  type JsonForm,
  walkFields,
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

describe("the builder's walkFields", () => {
  it.each(Object.entries(fixtures))('yields what walkFields does for the %s fixture', (_, json) => {
    const definition = json as JsonForm

    expect([...builder.walkFields(definition)]).toEqual([...walkFields(definition)])
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
})
