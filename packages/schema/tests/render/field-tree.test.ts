import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import {
  createSchemaBuilder,
  DefinitionError,
  defineFieldType,
  type FieldNode,
  type JsonField,
  type JsonForm,
} from '@whatsaaaa/form-builder-schema'
import { fixtures } from '../fixtures'
import { form } from '../helpers'

/** The tree without the field objects, to compare in one go. */
const shape = (nodes: readonly FieldNode[]): unknown[] =>
  nodes.map(({ type, role, kind, itemKind, dataPath, children }) => ({
    type,
    role,
    kind,
    itemKind,
    dataPath,
    children: shape(children),
  }))

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

const { getFieldTree } = createSchemaBuilder()

describe('getFieldTree', () => {
  it('makes a tree of the fields, with their roles and kinds', () => {
    const json = form(
      { type: 'heading', text: 'Order' },
      {
        name: 'address',
        type: 'group',
        fields: [{ type: 'divider' }, { name: 'city', type: 'text' }],
      },
      { name: 'tags', type: 'array', of: { type: 'number' } },
      { name: 'lines', type: 'array', fields: [{ name: 'qty', type: 'number' }] },
      { name: 'photos', type: 'file', multiple: true },
    )

    expect(shape(getFieldTree(json))).toEqual([
      { type: 'heading', role: 'display', kind: 'none', dataPath: [], children: [] },
      {
        type: 'group',
        role: 'group',
        kind: 'object',
        dataPath: ['address'],
        children: [
          { type: 'divider', role: 'display', kind: 'none', dataPath: ['address'], children: [] },
          {
            type: 'text',
            role: 'value',
            kind: 'string',
            dataPath: ['address', 'city'],
            children: [],
          },
        ],
      },
      {
        type: 'array',
        role: 'array',
        kind: 'array',
        dataPath: ['tags'],
        children: [
          { type: 'number', role: 'value', kind: 'number', dataPath: ['tags', '*'], children: [] },
        ],
      },
      {
        type: 'array',
        role: 'array',
        kind: 'array',
        dataPath: ['lines'],
        children: [
          {
            type: 'number',
            role: 'value',
            kind: 'number',
            dataPath: ['lines', '*', 'qty'],
            children: [],
          },
        ],
      },
      {
        type: 'file',
        role: 'value',
        kind: 'array',
        itemKind: 'file',
        dataPath: ['photos'],
        children: [],
      },
    ])
  })

  it('keeps the field from the definition on each node', () => {
    const city: JsonField = { name: 'city', type: 'text', ui: { width: 'half' } }
    const address: JsonField = { name: 'address', type: 'group', fields: [city] }
    const [node] = getFieldTree(form(address))

    expect(node?.field).toBe(address)
    expect(node?.children[0]?.field).toBe(city)
  })

  it('nests arrays and groups at any depth', () => {
    const json = form({
      name: 'orders',
      type: 'array',
      fields: [
        {
          name: 'lines',
          type: 'array',
          of: { type: 'group', fields: [{ name: 'qty', type: 'number' }] },
        },
      ],
    })
    const [orders] = getFieldTree(json)
    const [lines] = orders?.children ?? []
    const [item] = lines?.children ?? []

    expect(lines?.dataPath).toEqual(['orders', '*', 'lines'])
    expect(item?.role).toBe('group')
    expect(item?.dataPath).toEqual(['orders', '*', 'lines', '*'])
    expect(item?.children[0]?.dataPath).toEqual(['orders', '*', 'lines', '*', 'qty'])
  })

  it.each(Object.entries(fixtures))('gives every field of the %s fixture a role', (_, json) => {
    const roles = (nodes: readonly FieldNode[]): string[] =>
      nodes.flatMap((node) => [node.role, ...roles(node.children)])

    for (const role of roles(getFieldTree(json as JsonForm))) {
      expect(['value', 'group', 'array', 'display']).toContain(role)
    }
  })

  it('reads your own types, so your containers are groups or arrays by their kind', () => {
    const builder = createSchemaBuilder({ fieldTypes: { section, list } })
    const json = form(
      { name: 'person', type: 'section', fields: [{ name: 'name', type: 'text' }] },
      { name: 'tags', type: 'list', of: { type: 'text' } },
    )

    expect(shape(builder.getFieldTree(json))).toEqual([
      {
        type: 'section',
        role: 'group',
        kind: 'object',
        dataPath: ['person'],
        children: [
          {
            type: 'text',
            role: 'value',
            kind: 'string',
            dataPath: ['person', 'name'],
            children: [],
          },
        ],
      },
      {
        type: 'list',
        role: 'array',
        kind: 'array',
        dataPath: ['tags'],
        children: [
          { type: 'text', role: 'value', kind: 'string', dataPath: ['tags', '*'], children: [] },
        ],
      },
    ])
  })

  it('throws a DefinitionError with every issue, like build()', () => {
    const json = form({ name: 'a', type: 'nope' }, { name: 'b', type: 'text', requird: true })
    const error = (() => {
      try {
        getFieldTree(json)
      } catch (caught) {
        return caught
      }
    })()

    expect(error).toBeInstanceOf(DefinitionError)
    expect((error as DefinitionError).issues).toEqual(createSchemaBuilder().validate(json).issues)
    expect((error as DefinitionError).issues).toHaveLength(2)
  })
})
