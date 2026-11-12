import { Form, getInput, isDirty, reset, setInput } from '@formisch/react'
import { affects } from '@whatsaaaa/form-builder-affects'
import {
  createSchemaBuilder,
  defineFieldType,
  type JsonField,
  type JsonForm,
} from '@whatsaaaa/form-builder-schema'
import { JsonFields, useJsonForm, type UseJsonFormOptions } from '@whatsaaaa/form-builder-react'
import { act, useState } from 'react'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import business from '../../../fixtures/affects/business.json'
import order from '../../../fixtures/affects/order.json'
import shipping from '../../../fixtures/affects/shipping.json'
import signUp from '../../../fixtures/affects/sign-up.json'
import { arrays, builtInComponents, values } from './components'
import { fixtures } from './fixtures'
import { errorAt, form, mount, mountForm, submit, type, update, withHook } from './helpers'

/** The input a form starts with, for a definition and the `initialInput` of the options. */
const startOf = (json: JsonForm, initialInput: unknown, options?: UseJsonFormOptions) =>
  getInput(withHook(() => useJsonForm(json, { ...options, initialInput } as never)).form)

/** What the input at `path` shows. */
const shownAt = (root: HTMLElement, path: string) =>
  root.querySelector<HTMLInputElement>(`[data-path="${path}"] input`)?.value

const profile = form(
  { name: 'name', type: 'text' },
  { name: 'country', type: 'text', default: 'RS' },
  { name: 'age', type: 'number', default: 18 },
)

describe('initialInput', () => {
  it('starts the form with the values it gives', () => {
    const { root, jsonForm } = mountForm(profile, builtInComponents, {
      initialInput: { name: 'Ana', country: 'HR', age: 30 },
    })

    expect(getInput(jsonForm.form)).toEqual({ name: 'Ana', country: 'HR', age: 30 })
    expect(shownAt(root, 'name')).toBe('Ana')
    expect(shownAt(root, 'country')).toBe('HR')
    expect(shownAt(root, 'age')).toBe('30')
  })

  it('keeps the default of a field it leaves out', () => {
    expect(startOf(profile, { name: 'Ana' })).toEqual({ name: 'Ana', country: 'RS', age: 18 })
    expect(startOf(profile, {})).toEqual({ name: undefined, country: 'RS', age: 18 })
  })

  it('starts a field blank whose key is there without a value', () => {
    expect(startOf(profile, { country: undefined, age: null })).toEqual({
      name: undefined,
      country: undefined,
      age: null,
    })
  })

  it('changes nothing when it is left out, or is no object', () => {
    const defaults = { name: undefined, country: 'RS', age: 18 }

    expect(startOf(profile, undefined)).toEqual(defaults)
    expect(startOf(profile, null)).toEqual(defaults)
    expect(startOf(profile, 'Ana')).toEqual(defaults)
    expect(startOf(profile, ['Ana'])).toEqual(defaults)
  })

  it.each([...Object.entries(fixtures), ...Object.entries({ business, order, shipping, signUp })])(
    'starts the %s fixture the same without a key as without the option',
    (_, fixture) => {
      const builder = createSchemaBuilder({ extensions: [affects()] })
      const json = fixture as JsonForm

      expect(startOf(json, {}, { builder })).toEqual(startOf(json, undefined, { builder }))
    },
  )

  it('ignores a key that is no field', () => {
    expect(startOf(profile, { name: 'Ana', nickname: 'An' })).toEqual({
      name: 'Ana',
      country: 'RS',
      age: 18,
    })
  })

  it('is what the form resets to, and what it is dirty against', async () => {
    const { root, jsonForm } = mountForm(profile, builtInComponents, {
      initialInput: { name: 'Ana' },
    })
    expect(isDirty(jsonForm.form)).toBe(false)

    type(root, 'name', 'Mia')
    expect(isDirty(jsonForm.form)).toBe(true)
    await update(() => reset(jsonForm.form))

    expect(getInput(jsonForm.form)).toEqual({ name: 'Ana', country: 'RS', age: 18 })
    expect(shownAt(root, 'name')).toBe('Ana')
  })

  it('is read on the first render', async () => {
    let rename: () => void = () => {}
    const seen: unknown[] = []
    function App() {
      const [name, setName] = useState('Ana')
      rename = () => setName('Mia')
      const { form: store } = useJsonForm(profile, { initialInput: { name } })
      seen.push(getInput(store, { path: ['name'] }))
      return null
    }
    mount(<App />)
    await update(() => rename())

    expect(seen).toEqual(['Ana', 'Ana'])
  })
})

describe('initialInput for a group', () => {
  const json = fixtures.group as JsonForm

  it('merges the fields it gives over the defaults of the others', () => {
    expect(startOf(json, { address: { city: 'Zagreb' } })).toEqual({
      address: { street: undefined, city: 'Zagreb', zip: undefined, country: 'rs' },
    })
    expect(startOf(json, { address: { country: 'hr' } })).toMatchObject({
      address: { country: 'hr' },
    })
    expect(startOf(json, { address: { country: undefined } })).toMatchObject({
      address: { country: undefined },
    })
  })

  it('starts its fields blank when it is given anything but an object', () => {
    const blank = { address: { street: undefined, city: undefined, zip: undefined } }

    expect(startOf(json, { address: undefined })).toEqual({
      address: { ...blank.address, country: undefined },
    })
    expect(startOf(json, { address: null })).toMatchObject({ address: { country: undefined } })
    expect(startOf(json, { address: 'Zagreb' })).toMatchObject({ address: { country: undefined } })
    expect(startOf(json, { address: ['Zagreb'] })).toMatchObject({
      address: { country: undefined },
    })
  })

  it('merges groups at every depth, in your own container types too', () => {
    const section = defineFieldType({
      kind: 'object',
      container: true,
      props: v.object({ fields: v.array(v.custom<JsonField>(() => true)) }),
      schema: (field, ctx) => ctx.buildFields(field.fields, [...ctx.path, 'fields']),
    })
    const builder = createSchemaBuilder({ fieldTypes: { section } })
    const nested = form({
      name: 'person',
      type: 'section',
      fields: [
        { name: 'name', type: 'text', default: 'Anonymous' },
        {
          name: 'contact',
          type: 'group',
          fields: [
            { name: 'email', type: 'email' },
            { name: 'language', type: 'text', default: 'en' },
          ],
        },
      ],
    })

    expect(startOf(nested, { person: { contact: { email: 'a@b.co' } } }, { builder })).toEqual({
      person: { name: 'Anonymous', contact: { email: 'a@b.co', language: 'en' } },
    })
  })
})

describe('initialInput for a list', () => {
  const json = fixtures.array as JsonForm

  it('takes the list whole, in place of its default', () => {
    expect(startOf(json, { tags: ['a', 'b'] })).toEqual({ tags: ['a', 'b'], lines: [] })
    expect(startOf(json, { tags: [] })).toEqual({ tags: [], lines: [] })
    expect(startOf(json, { lines: [] })).toEqual({ tags: ['new'], lines: [] })
  })

  it('merges each item over what a new item starts with', () => {
    const lines = [{ product: 'Pen' }, { product: 'Ink', quantity: 3 }, { quantity: undefined }]

    expect(startOf(json, { lines })).toMatchObject({
      lines: [
        { product: 'Pen', quantity: 1 },
        { product: 'Ink', quantity: 3 },
        { product: undefined, quantity: undefined },
      ],
    })
  })

  it('renders the items it gives', () => {
    const { root } = mountForm(json, builtInComponents, {
      initialInput: { tags: ['a'], lines: [{ product: 'Pen' }] },
    })

    expect(shownAt(root, 'tags.0')).toBe('a')
    expect(shownAt(root, 'lines.0.product')).toBe('Pen')
    expect(shownAt(root, 'lines.0.quantity')).toBe('1')
  })

  it('starts empty when it is given anything but an array', () => {
    const empty = { tags: [], lines: [] }

    expect(startOf(json, { tags: undefined, lines: null })).toEqual(empty)
    expect(startOf(json, { tags: 'new', lines: { product: 'Pen' } })).toEqual(empty)
  })

  it('starts an item blank that is no object, and takes single values as they are', () => {
    expect(startOf(json, { tags: ['a', undefined], lines: [undefined, 'Pen', ['Pen']] })).toEqual({
      tags: ['a', undefined],
      lines: [
        { product: undefined, quantity: undefined },
        { product: undefined, quantity: undefined },
        { product: undefined, quantity: undefined },
      ],
    })
  })

  it('merges the groups and lists in its items, and the lists of lists', () => {
    const nested = form(
      {
        name: 'people',
        type: 'array',
        fields: [
          { name: 'name', type: 'text' },
          {
            name: 'address',
            type: 'group',
            fields: [
              { name: 'city', type: 'text' },
              { name: 'country', type: 'text', default: 'rs' },
            ],
          },
          {
            name: 'phones',
            type: 'array',
            fields: [
              { name: 'kind', type: 'text', default: 'mobile' },
              { name: 'number', type: 'text' },
            ],
          },
        ],
      },
      {
        name: 'grid',
        type: 'array',
        of: { type: 'array', fields: [{ name: 'on', type: 'checkbox', default: true }] },
      },
    )
    const people = [
      { name: 'Ana', address: { city: 'Zagreb' }, phones: [{ number: '1' }] },
      { name: 'Mia', phones: [{ number: '2' }, { kind: 'home', number: '3' }] },
    ]

    expect(startOf(nested, { people, grid: [[{}, { on: false }], 'row'] })).toEqual({
      people: [
        {
          name: 'Ana',
          address: { city: 'Zagreb', country: 'rs' },
          phones: [{ kind: 'mobile', number: '1' }],
        },
        {
          name: 'Mia',
          address: { city: undefined, country: 'rs' },
          phones: [
            { kind: 'mobile', number: '2' },
            { kind: 'home', number: '3' },
          ],
        },
      ],
      grid: [[{ on: true }, { on: false }], []],
    })
  })
})

describe('initialInput with conditions', () => {
  const builder = createSchemaBuilder({ extensions: [affects()] })

  it('starts a field blank that its conditions clear for the input', () => {
    const address = { street: 'Ilica 1', zip: '10000', city: 'Zagreb', country: 'HR' }

    expect(startOf(shipping as JsonForm, { shipping: address }, { builder })).toMatchObject({
      sameAsBilling: true,
      shipping: { street: undefined, zip: undefined, city: undefined, country: undefined },
    })
  })

  it('shows a field with its value that the input shows', () => {
    const address = { street: 'Ilica 1', zip: '10000', city: 'Zagreb' }
    const { root, jsonForm } = mountForm(shipping as JsonForm, builtInComponents, {
      builder,
      initialInput: { sameAsBilling: false, shipping: address, confirmZip: '10000' },
    })

    expect(getInput(jsonForm.form)).toMatchObject({ shipping: { ...address, country: 'DE' } })
    expect(shownAt(root, 'shipping.street')).toBe('Ilica 1')
    expect(shownAt(root, 'confirmZip')).toBe('10000')
  })

  it('clears the fields of each item of a list by its own fields', () => {
    const lines = [
      { kind: 'service', sku: 'P-1', quantity: 2 },
      { kind: 'discount', sku: 'P-2', quantity: 3 },
      { kind: 'product', sku: 'P-3' },
    ]

    expect(startOf(order as JsonForm, { lines }, { builder })).toMatchObject({
      lines: [
        { kind: 'service', sku: undefined, quantity: 2 },
        { kind: 'discount', sku: undefined, quantity: undefined },
        { kind: 'product', sku: 'P-3', quantity: 1 },
      ],
    })
  })
})

// The case of a language switch: one builder per language, and a new form for the other one.
describe('a form built again for another language', () => {
  const texts = {
    en: { 'email.required': 'Enter your email' },
    de: { 'email.required': 'E-Mail angeben' },
  }
  type Locale = keyof typeof texts
  const builders = {
    en: createSchemaBuilder({ resolveMessage: (key) => texts.en[key as never] }),
    de: createSchemaBuilder({ resolveMessage: (key) => texts.de[key as never] }),
  }
  const checkout = form(
    { name: 'email', type: 'email', required: { message: 'email.required' } },
    { name: 'country', type: 'text', default: 'DE' },
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'product', type: 'text' },
        { name: 'quantity', type: 'number', default: 1 },
      ],
    },
  )

  function mountCheckout(carry: boolean) {
    const submitted: unknown[] = []
    function CheckoutForm(props: {
      locale: Locale
      initialInput: Record<string, unknown> | undefined
      onSwitch: (input: Record<string, unknown>) => void
    }) {
      const jsonForm = useJsonForm(checkout, {
        builder: builders[props.locale],
        components: builtInComponents,
        initialInput: props.initialInput,
      })
      return (
        <Form of={jsonForm.form} onSubmit={(output) => void submitted.push(output)}>
          <JsonFields of={jsonForm} />
          <button type="button" onClick={() => props.onSwitch(getInput(jsonForm.form))}>
            Deutsch
          </button>
        </Form>
      )
    }
    function Checkout() {
      const [state, setState] = useState<{ locale: Locale; input?: Record<string, unknown> }>({
        locale: 'en',
      })
      return (
        <CheckoutForm
          key={state.locale}
          locale={state.locale}
          initialInput={state.input}
          onSwitch={(input) => setState(carry ? { locale: 'de', input } : { locale: 'de' })}
        />
      )
    }
    const root = mount(<Checkout />)
    const toGerman = () => act(() => root.querySelector('button')?.click())
    return { root, submitted, toGerman }
  }

  /** Fills the form in the way a person would, and clears two fields that have defaults. */
  async function fillIn(root: HTMLElement) {
    type(root, 'email', 'ana@example.com')
    type(root, 'country', '')
    await update(() => arrays.get('items')?.add())
    await update(() => arrays.get('items')?.add())
    type(root, 'items.0.product', 'Pen')
    await update(() => values.get('items.1.quantity')?.setInput(''))
  }

  it('starts empty without the previous input', async () => {
    const { root, toGerman } = mountCheckout(false)
    await fillIn(root)
    toGerman()

    expect(shownAt(root, 'email')).toBe('')
    expect(shownAt(root, 'country')).toBe('DE')
    expect(root.querySelector('[data-path^="items."]')).toBe(null)
  })

  it('keeps what the user typed, and cleared, with the previous input', async () => {
    const { root, submitted, toGerman } = mountCheckout(true)
    await fillIn(root)
    toGerman()

    expect(shownAt(root, 'email')).toBe('ana@example.com')
    expect(shownAt(root, 'country')).toBe('')
    expect(shownAt(root, 'items.0.product')).toBe('Pen')
    expect(shownAt(root, 'items.0.quantity')).toBe('1')
    expect(shownAt(root, 'items.1.quantity')).toBe('')

    await submit(root)
    expect(submitted).toEqual([
      {
        email: 'ana@example.com',
        country: undefined,
        items: [
          { product: 'Pen', quantity: 1 },
          { product: undefined, quantity: undefined },
        ],
      },
    ])
  })

  it('reports its messages in the new language, without the errors that were on show', async () => {
    const { root, toGerman } = mountCheckout(true)
    await submit(root)
    expect(errorAt(root, 'email')).toBe('Enter your email')

    type(root, 'country', 'AT')
    toGerman()
    expect(errorAt(root, 'email')).toBe(null)
    expect(shownAt(root, 'country')).toBe('AT')

    await submit(root)
    expect(errorAt(root, 'email')).toBe('E-Mail angeben')
  })
})

// The type errors are tests too: `pnpm type-check` fails when a @ts-expect-error line compiles.
describe('initialInput in a form typed with your input type', () => {
  const json = form(
    { name: 'name', type: 'text', default: 'Anonymous' },
    { name: 'address', type: 'group', fields: [{ name: 'city', type: 'text' }] },
    { name: 'lines', type: 'array', fields: [{ name: 'quantity', type: 'number', default: 1 }] },
  )

  // An interface, which Formisch's own constraint wouldn't take as it is.
  interface OrderInput {
    name: string
    address: { city?: string }
    lines: { quantity: number }[]
  }

  it('takes any part of the type, at any depth', () => {
    const { form: store } = withHook(() =>
      useJsonForm<OrderInput>(json, {
        initialInput: { address: { city: 'Novi Sad' }, lines: [{}, { quantity: 2 }] },
      }),
    )

    expect(getInput(store)).toEqual({
      name: 'Anonymous',
      address: { city: 'Novi Sad' },
      lines: [{ quantity: 1 }, { quantity: 2 }],
    })
  })

  it('takes the input of another form of the type', async () => {
    const first = withHook(() => useJsonForm<OrderInput>(json))
    await update(() => setInput(first.form, { path: ['name'], input: 'Ana' }))
    const { form: store } = withHook(() =>
      useJsonForm<OrderInput>(json, { initialInput: getInput(first.form) }),
    )

    expect(getInput(store)).toEqual({ name: 'Ana', address: { city: undefined }, lines: [] })
  })

  it('checks the keys and the values against the type', () => {
    const { form: wrongValue } = withHook(() =>
      // @ts-expect-error a value of the wrong type
      useJsonForm<OrderInput>(json, { initialInput: { name: 5 } }),
    )
    const { form: wrongKey } = withHook(() =>
      // @ts-expect-error a key that isn't in the type
      useJsonForm<OrderInput>(json, { initialInput: { nam: 'Ana' } }),
    )

    // At runtime the values are Formisch's to keep as they are, and the schema checks them.
    expect(getInput(wrongValue, { path: ['name'] })).toBe(5)
    expect(getInput(wrongKey, { path: ['name'] })).toBe('Anonymous')
  })

  it('takes a record typed by an interface in a form without a type', () => {
    const record: OrderInput = { name: 'Ana', address: {}, lines: [{ quantity: 2 }] }
    const { form: store } = withHook(() => useJsonForm(json, { initialInput: record }))

    expect(getInput(store)).toEqual({
      name: 'Ana',
      address: { city: undefined },
      lines: [{ quantity: 2 }],
    })
  })

  it('takes options without a type, as before', () => {
    const options: UseJsonFormOptions = { components: builtInComponents }
    const { components } = withHook(() => useJsonForm<OrderInput>(json, options))

    expect(components).toBe(builtInComponents)
  })
})
