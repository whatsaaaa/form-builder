import { getErrors, getInput } from '@formisch/vue'
import {
  createSchemaBuilder,
  DefinitionError,
  defineFieldType,
  type FieldNode,
  type JsonField,
  type JsonForm,
} from '@whatsaaaa/form-builder-schema'
import { useJsonForm } from '@whatsaaaa/form-builder-vue'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { fixtures } from './fixtures'
import { form, settle, silenceVueWarnings, withSetup } from './helpers'

// The field tree itself is tested in the schema package, which makes it with getFieldTree().

interface Shape {
  role: FieldNode['role']
  dataPath: FieldNode['dataPath']
  children: Shape[]
}

function shape({ role, dataPath, children }: FieldNode): Shape {
  return { role, dataPath, children: children.map(shape) }
}

describe('useJsonForm', () => {
  it('starts the form with the initial input of the definition', () => {
    const { form: store } = withSetup(() => useJsonForm(fixtures.array as JsonForm))

    expect(getInput(store)).toEqual({ tags: ['new'], lines: [] })
  })

  it('throws a DefinitionError for a definition with issues', () => {
    silenceVueWarnings()
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

  it("gives the definition's fields as a tree of roles and data paths", () => {
    const { fields: group } = withSetup(() => useJsonForm(fixtures.group as JsonForm))
    const { fields: array } = withSetup(() => useJsonForm(fixtures.array as JsonForm))

    expect(group.map(shape)).toEqual([
      {
        role: 'group',
        dataPath: ['address'],
        children: [
          { role: 'value', dataPath: ['address', 'street'], children: [] },
          { role: 'value', dataPath: ['address', 'city'], children: [] },
          { role: 'value', dataPath: ['address', 'zip'], children: [] },
          { role: 'value', dataPath: ['address', 'country'], children: [] },
        ],
      },
    ])
    expect(shape(array[1]!)).toEqual({
      role: 'array',
      dataPath: ['lines'],
      children: [
        { role: 'value', dataPath: ['lines', '*', 'product'], children: [] },
        { role: 'value', dataPath: ['lines', '*', 'quantity'], children: [] },
      ],
    })
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

    expect(fields.map(shape)).toEqual([
      {
        role: 'group',
        dataPath: ['person'],
        children: [{ role: 'value', dataPath: ['person', 'name'], children: [] }],
      },
    ])
    expect(getInput(store)).toEqual({ person: {} })
  })
})
