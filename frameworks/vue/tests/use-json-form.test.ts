import { getErrors, getInput } from '@formisch/vue'
import {
  createSchemaBuilder,
  DefinitionError,
  defineFieldType,
  type JsonField,
  type JsonForm,
} from '@whatsaaaa/form-builder-schema'
import { type FieldNode, useJsonForm } from '@whatsaaaa/form-builder-vue'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { fixtures } from './fixtures'
import { form, settle, withSetup } from './helpers'

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

describe('useJsonForm', () => {
  it('starts the form with the initial input of the definition', () => {
    const { form: store } = withSetup(() => useJsonForm(fixtures.array as JsonForm))

    expect(getInput(store)).toEqual({ tags: ['new'], lines: [] })
  })

  it('throws a DefinitionError for a definition with issues', () => {
    expect(() => withSetup(() => useJsonForm(form({ name: 'a', type: 'nope' })))).toThrow(
      DefinitionError,
    )
  })

  it('validates with the schema the builder builds', async () => {
    const json = form({ name: 'email', type: 'email', required: { message: 'Email please' } })
    const { form: store } = withSetup(() => useJsonForm(json, { validate: 'initial' }))
    await settle()

    expect(getErrors(store, { path: ['email'] })).toEqual(['Email please'])
  })

  it('gives every field of a fixture a role', () => {
    for (const json of Object.values(fixtures)) {
      const { fields } = withSetup(() => useJsonForm(json as JsonForm))
      for (const node of fields) expect(['value', 'group', 'array', 'display']).toContain(node.role)
    }
  })

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
    const { fields } = withSetup(() => useJsonForm(json))

    expect(shape(fields)).toEqual([
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

  it('reads your own types through the builder you pass', () => {
    // A container type of the consumer's own, built like the built-in group.
    const section = defineFieldType({
      kind: 'object',
      container: true,
      props: v.object({ fields: v.array(v.custom<JsonField>(() => true)) }),
      schema: (field, ctx) => ctx.buildFields(field.fields, [...ctx.path, 'fields']),
    })
    const builder = createSchemaBuilder({ fieldTypes: { section } })
    const json = form({ name: 'person', type: 'section', fields: [{ name: 'name', type: 'text' }] })
    const { fields, form: store } = withSetup(() => useJsonForm(json, { builder }))

    expect(shape(fields)).toEqual([
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
    ])
    expect(getInput(store)).toEqual({ person: {} })
  })
})
