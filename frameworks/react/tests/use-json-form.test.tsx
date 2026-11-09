import { getErrors, getInput } from '@formisch/react'
import {
  createSchemaBuilder,
  DefinitionError,
  defineFieldType,
  type FieldNode,
  type JsonField,
  type JsonForm,
} from '@whatsaaaa/form-builder-schema'
import { type FieldComponents, useJsonForm } from '@whatsaaaa/form-builder-react'
import { useEffect, useState } from 'react'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { TestInput } from './components'
import { fixtures } from './fixtures'
import { form, mount, settle, thrownBy, update, withHook } from './helpers'

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
    const { form: store } = withHook(() => useJsonForm(fixtures.array as JsonForm))

    expect(getInput(store)).toEqual({ tags: ['new'], lines: [] })
  })

  it('throws a DefinitionError for a definition with issues', () => {
    function App() {
      useJsonForm(form({ name: 'a', type: 'nope' }))
      return null
    }

    expect(thrownBy(<App />)).toBeInstanceOf(DefinitionError)
  })

  it('validates with the schema the builder builds', async () => {
    const json = form({ name: 'email', type: 'email', required: { message: 'Email please' } })
    const { form: store } = withHook(() => useJsonForm(json, { validate: 'initial' }))
    await settle()

    expect(getErrors(store, { path: ['email'] })).toEqual(['Email please'])
  })

  it("gives the definition's fields as a tree of roles and data paths", () => {
    const { fields: group } = withHook(() => useJsonForm(fixtures.group as JsonForm))
    const { fields: array } = withHook(() => useJsonForm(fixtures.array as JsonForm))

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
    const { fields, form: store } = withHook(() => useJsonForm(json, { builder }))

    expect(fields.map(shape)).toEqual([
      {
        role: 'group',
        dataPath: ['person'],
        children: [{ role: 'value', dataPath: ['person', 'name'], children: [] }],
      },
    ])
    expect(getInput(store)).toEqual({ person: {} })
  })

  it('reads the definition on the first render, and the components on every render', async () => {
    const first = form({ name: 'a', type: 'text' })
    const seen: { definition: JsonForm; components: unknown }[] = []
    let next: () => void = () => {}
    function Other() {
      return null
    }
    function App() {
      const [state, setState] = useState<{ json: JsonForm; components: FieldComponents }>({
        json: first,
        components: { text: TestInput },
      })
      next = () =>
        setState({ json: form({ name: 'b', type: 'text' }), components: { text: Other } })
      const jsonForm = useJsonForm(state.json, { components: state.components })
      useEffect(() => {
        seen.push({ definition: jsonForm.definition, components: jsonForm.components?.text })
      })
      return null
    }
    mount(<App />)
    await update(() => next())

    expect(seen).toEqual([
      { definition: first, components: TestInput },
      { definition: first, components: Other },
    ])
  })

  it('gives the same instance on every render while nothing it reads changes', async () => {
    const instances = new Set<unknown>()
    let rerender: () => void = () => {}
    const options = { components: { text: TestInput } }
    function App() {
      const [, setCount] = useState(0)
      rerender = () => setCount((count) => count + 1)
      instances.add(useJsonForm(form({ name: 'a', type: 'text' }), options))
      return null
    }
    mount(<App />)
    await update(() => rerender())

    expect(instances.size).toBe(1)
  })
})
