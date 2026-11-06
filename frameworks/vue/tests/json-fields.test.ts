import { getInput } from '@formisch/vue'
import {
  createSchemaBuilder,
  defineFieldType,
  type JsonField,
} from '@whatsaaaa/form-builder-schema'
import { JsonFields, useJsonForm } from '@whatsaaaa/form-builder-vue'
import * as v from 'valibot'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { builtInComponents, TestArray, TestGroup, TestInput, TestText, values } from './components'
import {
  errorAt,
  form,
  mount,
  mountForm,
  settle,
  silenceVueWarnings,
  submit,
  type,
} from './helpers'

/** The roles and paths the tests' components rendered, in document order. */
const rendered = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>('[data-role]')].map((element) =>
    `${element.dataset.role} ${element.dataset.path ?? ''}`.trim(),
  )

describe('<JsonFields>', () => {
  it('renders each field with the component for its type', () => {
    const json = form(
      { type: 'heading', text: 'Address' },
      {
        name: 'address',
        type: 'group',
        fields: [
          { name: 'street', type: 'text' },
          { type: 'divider' },
          { name: 'city', type: 'text' },
        ],
      },
      { name: 'agree', type: 'checkbox' },
    )
    const { root } = mountForm(json, builtInComponents)

    expect(rendered(root)).toEqual([
      'display',
      'group address',
      'value address.street',
      'display',
      'value address.city',
      'value agree',
    ])
  })

  it('gives a value component its field, path, kind and whether it is required', () => {
    const field: JsonField = { name: 'qty', type: 'number', required: { message: 'How many?' } }
    mountForm(form(field), builtInComponents)

    expect(values.get('qty')).toMatchObject({
      field,
      path: ['qty'],
      kind: 'number',
      required: true,
    })
    // Formisch names a field after its path.
    expect(values.get('qty')?.inputProps.name).toBe('["qty"]')
  })

  it('gives a display component only its field', () => {
    let got: Record<string, unknown> = {}
    const Heading = defineComponent({
      setup(_, { attrs }) {
        return () => {
          got = { ...attrs }
          return null
        }
      },
    })
    const field: JsonField = { type: 'heading', text: 'Hi' }
    mountForm(form(field), { heading: Heading })

    expect(got).toEqual({ field })
  })

  it('sets what is typed into the form', async () => {
    const json = form({ name: 'name', type: 'text' }, { name: 'qty', type: 'number' })
    const { root, jsonForm } = mountForm(json, builtInComponents)
    type(root, 'name', 'Ana')
    type(root, 'qty', '5')
    await settle()

    expect(getInput(jsonForm.form)).toEqual({ name: 'Ana', qty: 5 })
    expect(values.get('qty')?.input).toBe(5)
  })

  it('submits the output of the schema', async () => {
    const json = form({ name: 'qty', type: 'number', required: true })
    const { root, submitted } = mountForm(json, builtInComponents)
    type(root, 'qty', '12')
    await submit(root)

    expect(submitted).toEqual([{ qty: 12 }])
  })

  it('shows required and rule messages on their fields after a submit', async () => {
    const json = form(
      { name: 'email', type: 'email', required: { message: 'Email please' } },
      {
        name: 'qty',
        type: 'number',
        rules: [{ rule: 'minValue', value: 1, message: 'At least 1' }],
      },
    )
    const { root, submitted } = mountForm(json, builtInComponents)
    type(root, 'qty', '0')
    await submit(root)

    expect(errorAt(root, 'email')).toBe('Email please')
    expect(errorAt(root, 'qty')).toBe('At least 1')
    expect(submitted).toEqual([])
  })

  it('throws a TypeError that names every type without a component', () => {
    silenceVueWarnings()
    const json = form(
      { name: 'a', type: 'text' },
      { name: 'b', type: 'number' },
      { name: 'c', type: 'group', fields: [{ name: 'd', type: 'email' }] },
    )
    const app = () =>
      mount(
        defineComponent({
          setup() {
            const instance = useJsonForm(json)
            return () => h(JsonFields, { of: instance, components: { text: TestInput } })
          },
        }),
      )

    expect(app).toThrow(TypeError)
    expect(app).toThrow('No component for the field types "number", "group", "email"')
  })

  it('renders your own container types through the group and array roles', () => {
    const childField = v.custom<JsonField>(() => true)
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
    const json = form(
      { name: 'person', type: 'section', fields: [{ name: 'name', type: 'text' }] },
      { name: 'tags', type: 'list', default: ['a', 'b'], of: { type: 'text' } },
    )
    const components = { section: TestGroup, list: TestArray, text: TestInput, heading: TestText }
    const { root } = mountForm(json, components, { builder })

    expect(rendered(root)).toEqual([
      'group person',
      'value person.name',
      'array tags',
      'value tags.0',
      'value tags.1',
    ])
  })
})
