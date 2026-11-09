import { Form, getInput } from '@formisch/vue'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import {
  JsonField,
  JsonFields,
  type JsonFormInstance,
  useJsonForm,
} from '@whatsaaaa/form-builder-vue'
import { type Component, defineComponent, h, type VNode } from 'vue'
import { describe, expect, it } from 'vitest'
import { arrays, builtInComponents, TestInput } from './components'
import {
  errorAt,
  form,
  mount,
  settle,
  silenceVueWarnings,
  submit,
  type,
  withSetup,
} from './helpers'

const signup = form(
  { type: 'heading', text: 'Sign up' },
  { name: 'name', type: 'text' },
  { name: 'email', type: 'email', required: { message: 'Email please' } },
  {
    name: 'address',
    type: 'group',
    fields: [
      { name: 'street', type: 'text' },
      { name: 'city', type: 'text' },
    ],
  },
  {
    name: 'lines',
    type: 'array',
    fields: [
      { name: 'product', type: 'text' },
      { name: 'qty', type: 'number', default: 1 },
    ],
  },
  { name: 'newsletter', type: 'checkbox' },
)

/**
 * Mounts Formisch's `<Form>` around what `layout` renders, with the components given to
 * `useJsonForm`. Gives the element, the form, and every output it submitted.
 */
function mountLayout(json: JsonForm, layout: (jsonForm: JsonFormInstance) => VNode[]) {
  const submitted: unknown[] = []
  const jsonForm = withSetup(() => useJsonForm(json, { components: builtInComponents }))
  const root = mount(
    defineComponent({
      setup: () => () =>
        h(
          Form as Component,
          { of: jsonForm.form, onSubmit: (output: unknown) => submitted.push(output) },
          { default: () => layout(jsonForm) },
        ),
    }),
  )
  return { root, jsonForm, submitted }
}

/** The paths of the fields rendered inside `selector`, in document order. */
const pathsIn = (root: HTMLElement, selector: string) =>
  [...root.querySelectorAll<HTMLElement>(`${selector} [data-path]`)].map(
    (element) => element.dataset.path,
  )

/** Mounts a component that sets up `render`, and gives what it threw. */
function thrownBy(render: (jsonForm: JsonFormInstance) => VNode) {
  silenceVueWarnings()
  const jsonForm = withSetup(() => useJsonForm(signup, { components: builtInComponents }))
  try {
    mount(defineComponent({ setup: () => () => render(jsonForm) }))
  } catch (error) {
    return error
  }
  return undefined
}

describe('placing fields', () => {
  it('renders a field with <JsonField> wherever it is, and leaves it out of <JsonFields>', () => {
    const { root } = mountLayout(signup, (jsonForm) => [
      h('main', h(JsonFields, { of: jsonForm, except: ['email', 'newsletter'] })),
      h('aside', [
        h(JsonField, { of: jsonForm, path: 'newsletter' }),
        h(JsonField, { of: jsonForm, path: 'email' }),
      ]),
    ])

    expect(pathsIn(root, 'main')).toEqual([
      'name',
      'address',
      'address.street',
      'address.city',
      'lines',
    ])
    expect(pathsIn(root, 'aside')).toEqual(['newsletter', 'email'])
  })

  it('types, validates and submits a placed field like any other', async () => {
    const { root, jsonForm, submitted } = mountLayout(signup, (instance) => [
      h('main', h(JsonFields, { of: instance, except: ['email'] })),
      h('aside', h(JsonField, { of: instance, path: 'email' })),
    ])
    await submit(root)
    expect(errorAt(root, 'email')).toBe('Email please')

    type(root, 'email', 'ana@example.com')
    await submit(root)
    expect(getInput(jsonForm.form)).toMatchObject({ email: 'ana@example.com' })
    expect(submitted).toEqual([{ email: 'ana@example.com', address: {}, lines: [] }])
  })

  it('places a group or an array with the fields inside it', async () => {
    const { root } = mountLayout(signup, (jsonForm) => [
      h('section', { class: 'group' }, h(JsonField, { of: jsonForm, path: 'address' })),
      h('section', { class: 'array' }, h(JsonField, { of: jsonForm, path: 'lines' })),
    ])
    arrays.get('lines')?.add()
    await settle()

    expect(pathsIn(root, '.group')).toEqual(['address', 'address.street', 'address.city'])
    expect(pathsIn(root, '.array')).toEqual(['lines', 'lines.0.product', 'lines.0.qty'])
  })

  it('places a field of a group on its own, and leaves it out of its group', () => {
    const { root } = mountLayout(signup, (jsonForm) => [
      h('main', h(JsonFields, { of: jsonForm, except: ['address.city'] })),
      h('aside', h(JsonField, { of: jsonForm, path: 'address.city' })),
    ])

    expect(pathsIn(root, 'main')).toContain('address.street')
    expect(pathsIn(root, 'main')).not.toContain('address.city')
    expect(pathsIn(root, 'aside')).toEqual(['address.city'])
  })

  it("leaves a field out of every item of an array with '*' in its path", async () => {
    const { root } = mountLayout(signup, (jsonForm) => [
      h(JsonFields, { of: jsonForm, only: ['lines'], except: ['lines.*.qty'] }),
    ])
    arrays.get('lines')?.add()
    arrays.get('lines')?.add()
    await settle()

    expect(pathsIn(root, 'form')).toEqual(['lines', 'lines.0.product', 'lines.1.product'])
  })

  it('renders only the fields `only` names, in the order of the definition', () => {
    const { root } = mountLayout(signup, (jsonForm) => [
      h(JsonFields, { of: jsonForm, only: ['newsletter', 'name', 'address.city'] }),
    ])

    expect(pathsIn(root, 'form')).toEqual(['name', 'address.city', 'newsletter'])
    expect(root.querySelector('[data-role="display"]')).toBe(null)
  })

  it('keeps two fields of the same name at different depths apart in `only`', async () => {
    const billing = form(
      { name: 'email', type: 'email' },
      { name: 'billing', type: 'group', fields: [{ name: 'email', type: 'email' }] },
    )
    const { root, jsonForm } = mountLayout(billing, (instance) => [
      h(JsonFields, { of: instance, only: ['email', 'billing.email'] }),
    ])
    type(root, 'email', 'ana@example.com')
    type(root, 'billing.email', 'bo@example.com')
    await settle()

    expect(pathsIn(root, 'form')).toEqual(['email', 'billing.email'])
    expect(getInput(jsonForm.form)).toEqual({
      email: 'ana@example.com',
      billing: { email: 'bo@example.com' },
    })
  })

  it('never takes a display element for the field of its name', () => {
    const named = form(
      { type: 'heading', name: 'email', text: 'Contact' },
      { name: 'email', type: 'email' },
    )
    const { root } = mountLayout(named, (jsonForm) => [
      h('main', h(JsonFields, { of: jsonForm, except: ['email'] })),
      h('aside', h(JsonField, { of: jsonForm, path: 'email' })),
    ])

    expect(root.querySelector('main [data-role="display"]')?.textContent).toBe('Contact')
    expect(pathsIn(root, 'main')).toEqual([])
    expect(pathsIn(root, 'aside')).toEqual(['email'])
    expect(root.querySelector('aside [data-role="display"]')).toBe(null)
  })

  it('throws a TypeError for a path that names no field', () => {
    const placed = thrownBy((jsonForm) => h(JsonField, { of: jsonForm, path: 'emial' }))
    const excepted = thrownBy((jsonForm) => h(JsonFields, { of: jsonForm, except: ['emial'] }))

    expect(placed).toBeInstanceOf(TypeError)
    expect((placed as Error).message).toBe('No field at "emial" in the definition.')
    expect((excepted as Error).message).toBe('No field at "emial" in the definition.')
  })

  it("throws a TypeError for a field of an array's items placed on its own", () => {
    const placed = thrownBy((jsonForm) => h(JsonField, { of: jsonForm, path: 'lines.*.qty' }))
    const only = thrownBy((jsonForm) => h(JsonFields, { of: jsonForm, only: ['lines.*.qty'] }))

    expect((placed as Error).message).toBe(
      `"lines.*.qty" is in an array's items, so it can't be placed on its own. Place "lines" instead.`,
    )
    expect(only).toBeInstanceOf(TypeError)
  })

  it('takes components from the props over the ones useJsonForm got', () => {
    const Custom = defineComponent({ setup: () => () => h('b', { 'data-custom': '' }) })
    const { root } = mountLayout(signup, (jsonForm) => [
      h(JsonField, { of: jsonForm, path: 'name', components: { text: Custom } }),
    ])

    expect(root.querySelector('[data-custom]')).not.toBe(null)
  })

  it('throws a TypeError when there are no components at all', () => {
    silenceVueWarnings()
    const jsonForm = withSetup(() => useJsonForm(signup))
    const app = () => mount(defineComponent({ setup: () => () => h(JsonFields, { of: jsonForm }) }))

    expect(app).toThrow('No field components. Pass them to useJsonForm, or to the component.')
  })

  it('checks only the components of the fields it renders', () => {
    const jsonForm = withSetup(() => useJsonForm(signup))
    const app = () =>
      mount(
        defineComponent({
          setup: () => () =>
            h(JsonField, {
              of: jsonForm,
              path: 'name',
              components: { text: TestInput },
            }),
        }),
      )

    expect(app).not.toThrow()
  })
})
