import { Form, getInput, setInput, useField } from '@formisch/react'
import {
  JsonField,
  JsonFields,
  type JsonFormInstance,
  type TypedBuiltSchema,
  useJsonForm,
} from '@whatsaaaa/form-builder-react'
import { useEffect } from 'react'
import { describe, expect, it } from 'vitest'
import { arrays, builtInComponents } from './components'
import { form, mount, settle, submit, type, update } from './helpers'

// The type errors are tests too: `pnpm type-check` fails when a @ts-expect-error line compiles.

const order = form(
  { name: 'name', type: 'text', required: true },
  {
    name: 'address',
    type: 'group',
    fields: [{ name: 'city', type: 'text' }],
  },
  {
    name: 'lines',
    type: 'array',
    fields: [{ name: 'quantity', type: 'number', default: 1 }],
  },
)

// An interface, which Formisch's own constraint wouldn't take as it is.
interface OrderInput {
  name: string
  address: { city?: string }
  lines: { quantity: number }[]
}

type OrderForm = JsonFormInstance<TypedBuiltSchema<OrderInput>>

/** The quantity of the first line, read with Formisch's own `useField` on a nested path. */
function Quantity({ of }: { of: OrderForm }) {
  const quantity = useField(of.form, { path: ['lines', 0, 'quantity'] })
  return <output data-quantity="">{quantity.input}</output>
}

/** Mounts a typed form with `<JsonFields>`, and gives the element, the form and its outputs. */
function mountTyped() {
  const submitted: OrderInput[] = []
  const instance: { current?: OrderForm } = {}
  function App() {
    const jsonForm = useJsonForm<OrderInput>(order, { components: builtInComponents })
    useEffect(() => {
      instance.current = jsonForm
    })
    return (
      <Form of={jsonForm.form} onSubmit={(output) => void submitted.push(output)}>
        <JsonFields of={jsonForm} />
        {getInput(jsonForm.form, { path: ['lines'] })?.length ? <Quantity of={jsonForm} /> : null}
      </Form>
    )
  }
  const root = mount(<App />)
  return { root, jsonForm: instance.current as OrderForm, submitted }
}

describe('a form typed with your input type', () => {
  it("checks Formisch's paths and values against it", () => {
    const { jsonForm } = mountTyped()

    const city: string | undefined = getInput(jsonForm.form, { path: ['address', 'city'] })
    const lines = getInput(jsonForm.form, { path: ['lines'] })
    // @ts-expect-error a path that isn't in the type
    const typo = () => getInput(jsonForm.form, { path: ['adress', 'city'] })
    // @ts-expect-error a value of the wrong type
    const wrongType = () => setInput(jsonForm.form, { path: ['name'], input: 5 })

    expect(city).toBe(undefined)
    expect(lines).toEqual([])
    // At runtime Formisch only knows the paths of the schema, and the schema checks the values.
    expect(typo).toThrow()
    expect(wrongType).not.toThrow()
  })

  it('renders and submits with <JsonFields> and <JsonField> like an untyped one', async () => {
    const { root, submitted } = mountTyped()
    type(root, 'name', 'Ana')
    type(root, 'address.city', 'Novi Sad')
    await update(() => arrays.get('lines')?.add())
    await submit(root)

    expect(submitted).toEqual([
      { name: 'Ana', address: { city: 'Novi Sad' }, lines: [{ quantity: 1 }] },
    ])

    function Placed() {
      const jsonForm = useJsonForm<OrderInput>(order)
      return <JsonField of={jsonForm} path="name" components={builtInComponents} />
    }
    const placed = mount(<Placed />)
    expect(placed.querySelector('[data-path="name"]')).not.toBe(null)
  })

  it("works with Formisch's own field functions on nested paths", async () => {
    const { root, jsonForm } = mountTyped()
    await update(() => arrays.get('lines')?.add())

    await update(() => setInput(jsonForm.form, { path: ['address', 'city'], input: 'Belgrade' }))
    await settle()

    expect(root.querySelector<HTMLInputElement>('[data-path="address.city"] input')?.value).toBe(
      'Belgrade',
    )
    expect(root.querySelector('[data-quantity]')?.textContent).toBe('1')
  })
})
