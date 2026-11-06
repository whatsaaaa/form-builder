import { getInput } from '@formisch/vue'
import { describe, expect, it } from 'vitest'
import { arrays, builtInComponents } from './components'
import { errorAt, form, mountForm, settle, submit, type } from './helpers'

const lines = form({
  name: 'lines',
  type: 'array',
  fields: [
    { name: 'product', type: 'text', required: { message: 'Which product?' } },
    { name: 'qty', type: 'number', default: 1 },
  ],
})

/** Every input's path and value, in document order. */
const inputs = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>('[data-role="value"]')].map(
    (element) => `${element.dataset.path}=${element.querySelector('input')?.value}`,
  )

describe('<JsonFields> with arrays', () => {
  it('renders the fields of each item with the index in their path', () => {
    const json = form({ name: 'tags', type: 'array', default: ['a', 'b'], of: { type: 'text' } })
    const { root } = mountForm(json, builtInComponents)

    expect(inputs(root)).toEqual(['tags.0=a', 'tags.1=b'])
  })

  it('adds an item with the defaults of its fields', async () => {
    const { root, jsonForm } = mountForm(lines, builtInComponents)
    arrays.get('lines')?.add()
    await settle()

    expect(inputs(root)).toEqual(['lines.0.product=', 'lines.0.qty=1'])
    expect(getInput(jsonForm.form)).toEqual({ lines: [{ qty: 1 }] })
  })

  it('adds an item with the default of the item field, in a list of single values', async () => {
    const json = form(
      { name: 'tags', type: 'array', of: { type: 'text', default: 'new' } },
      {
        name: 'people',
        type: 'array',
        of: { type: 'group', fields: [{ name: 'role', type: 'text', default: 'guest' }] },
      },
    )
    const { jsonForm } = mountForm(json, builtInComponents)
    arrays.get('tags')?.add()
    arrays.get('people')?.add()
    await settle()

    expect(getInput(jsonForm.form)).toEqual({ tags: ['new'], people: [{ role: 'guest' }] })
  })

  it('keeps the values of each item when one is removed or moved', async () => {
    const { root, jsonForm } = mountForm(lines, builtInComponents)
    const array = () => arrays.get('lines')
    array()?.add()
    array()?.add()
    array()?.add()
    await settle()
    type(root, 'lines.0.product', 'Tea')
    type(root, 'lines.1.product', 'Milk')
    type(root, 'lines.2.product', 'Bread')
    type(root, 'lines.2.qty', '3')
    await settle()

    array()?.remove(0)
    await settle()
    expect(inputs(root)).toEqual([
      'lines.0.product=Milk',
      'lines.0.qty=1',
      'lines.1.product=Bread',
      'lines.1.qty=3',
    ])

    array()?.move(1, 0)
    await settle()
    expect(getInput(jsonForm.form)).toEqual({
      lines: [
        { product: 'Bread', qty: 3 },
        { product: 'Milk', qty: 1 },
      ],
    })
  })

  it('types into the item a field is in', async () => {
    const { root, jsonForm } = mountForm(lines, builtInComponents)
    arrays.get('lines')?.add()
    arrays.get('lines')?.add()
    await settle()
    type(root, 'lines.1.qty', '7')
    await settle()

    expect(getInput(jsonForm.form)).toEqual({ lines: [{ qty: 1 }, { qty: 7 }] })
  })

  it("shows an item's error on that item's field after a submit", async () => {
    const { root } = mountForm(lines, builtInComponents)
    arrays.get('lines')?.add()
    arrays.get('lines')?.add()
    await settle()
    type(root, 'lines.0.product', 'Tea')
    await submit(root)

    expect(errorAt(root, 'lines.0.product')).toBe(null)
    expect(errorAt(root, 'lines.1.product')).toBe('Which product?')
  })

  it("gives the array its own errors, like a required array's message", async () => {
    const json = form({
      name: 'tags',
      type: 'array',
      required: { message: 'Add a tag' },
      of: { type: 'text' },
    })
    const { root } = mountForm(json, builtInComponents)
    await submit(root)

    expect(arrays.get('tags')?.errors).toEqual(['Add a tag'])
    expect(errorAt(root, 'tags')).toBe('Add a tag')
  })
})
