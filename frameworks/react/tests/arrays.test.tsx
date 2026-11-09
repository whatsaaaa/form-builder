import { getInput } from '@formisch/react'
import { describe, expect, it } from 'vitest'
import { arrays, builtInComponents } from './components'
import { errorAt, form, mountForm, settle, submit, type, update } from './helpers'

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

const array = (path: string) => {
  const props = arrays.get(path)
  if (!props) throw new Error(`No array at ${path}`)
  return props
}

describe('<JsonFields> with arrays', () => {
  it('renders the fields of each item with the index in their path', () => {
    const json = form({ name: 'tags', type: 'array', default: ['a', 'b'], of: { type: 'text' } })
    const { root } = mountForm(json, builtInComponents)

    expect(inputs(root)).toEqual(['tags.0=a', 'tags.1=b'])
  })

  it('adds an item with the defaults of its fields', async () => {
    const { root, jsonForm } = mountForm(lines, builtInComponents)
    await update(() => array('lines').add())

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
    await update(() => {
      array('tags').add()
      array('people').add()
    })

    expect(getInput(jsonForm.form)).toEqual({ tags: ['new'], people: [{ role: 'guest' }] })
  })

  it('keeps the values of each item when one is removed or moved', async () => {
    const { root, jsonForm } = mountForm(lines, builtInComponents)
    await update(() => {
      array('lines').add()
      array('lines').add()
      array('lines').add()
    })
    type(root, 'lines.0.product', 'Tea')
    type(root, 'lines.1.product', 'Milk')
    type(root, 'lines.2.product', 'Bread')
    type(root, 'lines.2.qty', '3')
    await settle()

    await update(() => array('lines').remove(0))
    expect(inputs(root)).toEqual([
      'lines.0.product=Milk',
      'lines.0.qty=1',
      'lines.1.product=Bread',
      'lines.1.qty=3',
    ])

    await update(() => array('lines').move(1, 0))
    expect(inputs(root)).toEqual([
      'lines.0.product=Bread',
      'lines.0.qty=3',
      'lines.1.product=Milk',
      'lines.1.qty=1',
    ])
    expect(getInput(jsonForm.form)).toEqual({
      lines: [
        { product: 'Bread', qty: 3 },
        { product: 'Milk', qty: 1 },
      ],
    })
  })

  it('keeps the same methods while the array is the same', async () => {
    mountForm(lines, builtInComponents)
    const before = array('lines')
    await update(() => before.add())

    expect(array('lines').items).toHaveLength(1)
    expect(array('lines').add).toBe(before.add)
    expect(array('lines').remove).toBe(before.remove)
  })

  it('types into the item a field is in', async () => {
    const { root, jsonForm } = mountForm(lines, builtInComponents)
    await update(() => {
      array('lines').add()
      array('lines').add()
    })
    type(root, 'lines.1.qty', '7')
    await settle()

    expect(getInput(jsonForm.form)).toEqual({ lines: [{ qty: 1 }, { qty: 7 }] })
  })

  it("shows an item's error on that item's field after a submit", async () => {
    const { root } = mountForm(lines, builtInComponents)
    await update(() => {
      array('lines').add()
      array('lines').add()
    })
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

    expect(array('tags').errors).toEqual(['Add a tag'])
    expect(errorAt(root, 'tags')).toBe('Add a tag')
  })

  it('renders arrays inside the items of an array', async () => {
    const json = form({
      name: 'orders',
      type: 'array',
      fields: [{ name: 'lines', type: 'array', of: { type: 'text', default: 'x' } }],
    })
    const { root, jsonForm } = mountForm(json, builtInComponents)
    await update(() => array('orders').add())
    await update(() => array('orders.0.lines').add())

    expect(inputs(root)).toEqual(['orders.0.lines.0=x'])
    expect(getInput(jsonForm.form)).toEqual({ orders: [{ lines: ['x'] }] })
  })
})
