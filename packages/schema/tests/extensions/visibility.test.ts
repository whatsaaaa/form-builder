import { describe, expect, it } from 'vitest'
import {
  createSchemaBuilder,
  DefinitionError,
  findField,
  type FieldNode,
  type JsonForm,
  type LayoutField,
  type LayoutNode,
} from '@whatsaaaa/form-builder-schema'
import { form, outline } from '../helpers'
import { hideWhen } from './hide-when'

const builder = createSchemaBuilder({ extensions: [hideWhen()] })

/** The fields of the tree, by dot path or type, that are hidden for `input`. */
function hiddenFields(json: JsonForm, input: unknown, indexes: readonly number[] = []) {
  const state = builder.getVisibility(json).of(input)
  const hidden: string[] = []
  const visit = (nodes: readonly FieldNode[]) => {
    for (const node of nodes) {
      const name = node.role === 'display' ? node.type : node.dataPath.join('.')
      if (state.isHidden(node, indexes)) hidden.push(name)
      visit(node.children)
    }
  }
  visit(builder.getFieldTree(json))
  return hidden
}

describe('getVisibility', () => {
  it('hides nothing without conditions, whatever the input', () => {
    const json = form({ name: 'a', type: 'text' })
    const visibility = builder.getVisibility(json)
    expect(visibility.conditional).toBe(false)
    expect(visibility.of({ a: 'x' })).toBe(visibility.of(undefined))
    expect(visibility.of({}).toClear).toEqual([])
    expect(visibility.clear({ a: 'x' })).toEqual({ a: 'x' })
    expect(createSchemaBuilder().getVisibility(json).conditional).toBe(false)
  })

  it('renders every node of the layout without conditions', () => {
    const json: JsonForm = {
      ...form({ name: 'a', type: 'text' }, { name: 'b', type: 'text' }),
      layout: {
        items: [{ type: 'section', items: [{ type: 'heading', text: 'H' }, 'a', 'b'] }],
      } as never,
    }
    const [step] = builder.getLayout(json).steps
    const state = builder.getVisibility(json).of({})
    expect(state.isStepHidden(step as never)).toBe(false)
    expect(state.isHidden(findField(builder.getFieldTree(json), 'a'), [])).toBe(false)
    const nodes = step?.children ?? []
    expect(outline(state.shownNodes(nodes, []))).toEqual(['section', '  heading', '  a', '  b'])
    const onlyText = state.shownNodes(nodes, [], (node) => node.role === 'display')
    expect(outline(onlyText)).toEqual([])
  })

  it('throws the issues of the definition, like build()', () => {
    expect(() => builder.getVisibility(form({ name: 'a', type: 'nope' }))).toThrow(DefinitionError)
  })

  it('gives the same state while what is hidden stays the same', () => {
    const json = form(
      { name: 'a', type: 'text' },
      { name: 'b', type: 'text', hideWhen: { field: 'a' } },
    )
    const visibility = builder.getVisibility(json)
    expect(visibility.conditional).toBe(true)
    const first = visibility.of({ a: 'x' })
    expect(visibility.of({ a: 'xy' })).toBe(first)
    const shown = visibility.of({ a: '' })
    expect(shown).not.toBe(first)
    expect(visibility.of({ a: undefined })).toBe(shown)
  })
})

describe('isHidden', () => {
  it('hides a field, and every field inside a hidden group', () => {
    const json = form(
      { name: 'a', type: 'checkbox' },
      {
        name: 'g',
        type: 'group',
        hideWhen: { field: 'a' },
        fields: [
          { type: 'heading', text: 'G' },
          { name: 'x', type: 'text' },
        ],
      },
    )
    expect(hiddenFields(json, { a: true })).toEqual(['g', 'heading', 'g.x'])
    expect(hiddenFields(json, { a: false })).toEqual([])
  })

  it('hides a group whose fields are all hidden, unless a display element of it with conditions shows', () => {
    const json = form(
      { name: 'a', type: 'checkbox' },
      { name: 'b', type: 'checkbox' },
      {
        name: 'g',
        type: 'group',
        fields: [
          { type: 'heading', text: 'Always' },
          { name: 'x', type: 'text', hideWhen: { field: 'a' } },
          { type: 'paragraph', text: 'Sometimes', hideWhen: { field: 'b' } },
        ],
      },
    )
    expect(hiddenFields(json, { a: true, b: false })).toEqual(['g.x'])
    expect(hiddenFields(json, { a: true, b: true })).toEqual(['g', 'g.x', 'paragraph'])
    expect(hiddenFields(json, { a: false, b: true })).toEqual(['paragraph'])
  })

  it('hides the fields of each item by its own fields', () => {
    const json = form({
      name: 'lines',
      type: 'array',
      fields: [
        { name: 'kind', type: 'text' },
        { name: 'sku', type: 'text', hideWhen: { field: 'lines.*.kind', equals: 'service' } },
      ],
    })
    const input = { lines: [{ kind: 'product' }, { kind: 'service' }] }
    expect(hiddenFields(json, input, [0])).toEqual([])
    expect(hiddenFields(json, input, [1])).toEqual(['lines.*.sku'])
  })

  it('hides a field that a field it reads, hidden, would show', () => {
    const json = form(
      { name: 'a', type: 'checkbox' },
      { name: 'b', type: 'text', hideWhen: { field: 'a' } },
      { name: 'c', type: 'text', hideWhen: { field: 'b', equals: 'x' } },
      { name: 'd', type: 'text', hideWhen: { field: 'c' } },
    )
    expect(hiddenFields(json, { a: false, b: 'x', d: 'y' })).toEqual(['c'])
    // b is hidden, so it reads as empty: c shows, and hides d.
    expect(hiddenFields(json, { a: true, b: 'x', c: 'z' })).toEqual(['b', 'd'])
  })
})

describe('toClear and clear', () => {
  const json = form(
    { name: 'same', type: 'checkbox' },
    {
      name: 'shipping',
      type: 'group',
      hideWhen: { field: 'same', clear: true },
      fields: [
        { name: 'zip', type: 'text' },
        { name: 'city', type: 'text' },
        { name: 'stops', type: 'array', fields: [{ name: 'at', type: 'text' }] },
      ],
    },
    { name: 'note', type: 'text', hideWhen: { field: 'same' } },
  )
  const visibility = builder.getVisibility(json)
  const input = {
    same: true,
    shipping: { zip: '1010', city: '', stops: [{ at: 'x' }] },
    note: 'kept',
  }

  it("lists the cleared fields that hold something, and not an array's fields", () => {
    expect(visibility.of(input).toClear).toEqual([
      { path: ['shipping', 'zip'], input: undefined },
      { path: ['shipping', 'stops'], input: [] },
    ])
  })

  it('is empty once they are blank', () => {
    const cleared = visibility.clear(input)
    expect(cleared).toEqual({ same: true, shipping: { city: '', stops: [] }, note: 'kept' })
    expect(visibility.of(cleared).toClear).toEqual([])
    expect(visibility.clear(cleared)).toEqual(cleared)
  })

  it('leaves the input as it is', () => {
    visibility.clear(input)
    expect(input.shipping.zip).toBe('1010')
  })

  it('clears a whole chain in one go', () => {
    const chain = form(
      { name: 'a', type: 'checkbox' },
      { name: 'b', type: 'text', hideWhen: { field: 'a', clear: true } },
      { name: 'c', type: 'text', hideWhen: { field: 'b', equals: 'keep', clear: true } },
    )
    const chained = builder.getVisibility(chain)
    // b is hidden, so it reads as empty, and c shows.
    expect(chained.of({ a: true, b: 'keep', c: 'x' }).toClear).toEqual([
      { path: ['b'], input: undefined },
    ])
    expect(chained.of({ a: false, b: 'keep', c: 'x' }).toClear).toEqual([
      { path: ['c'], input: undefined },
    ])
  })
})

describe('the layout', () => {
  const json: JsonForm = {
    ...form(
      { name: 'business', type: 'checkbox' },
      { name: 'promo', type: 'checkbox' },
      { name: 'name', type: 'text', hideWhen: { field: 'business', equals: false } },
      { name: 'vat', type: 'text', hideWhen: { field: 'business', equals: false } },
      { name: 'code', type: 'text', hideWhen: { field: 'promo', equals: false } },
      { name: 'note', type: 'text' },
    ),
    layout: {
      steps: [
        { id: 'start', items: ['business', 'promo'] },
        {
          id: 'company',
          items: [
            { type: 'heading', text: 'Company' },
            { type: 'row', items: ['name', 'vat'] },
          ],
        },
        {
          id: 'extra',
          items: [
            {
              type: 'section',
              id: 'promo',
              hideWhen: { field: 'promo', equals: false },
              items: [{ type: 'paragraph', text: 'Welcome' }],
            },
            {
              type: 'section',
              id: 'code',
              items: [
                'code',
                {
                  type: 'paragraph',
                  text: 'Thanks',
                  hideWhen: { field: 'business', equals: false },
                },
              ],
            },
            { type: 'section', id: 'other', items: ['note'] },
          ],
        },
        {
          id: 'done',
          hideWhen: { field: 'business', equals: false },
          items: [{ type: 'paragraph', text: 'Done' }],
        },
      ],
    } as never,
  }
  const { steps } = builder.getLayout(json)
  const visibility = builder.getVisibility(json)
  const shown = (input: unknown, step: number) =>
    outline(visibility.of(input).shownNodes(steps[step]?.children ?? [], []))
  const hiddenSteps = (input: unknown) =>
    steps.filter((step) => visibility.of(input).isStepHidden(step)).map((step) => step.step.id)

  it('hides a step whose fields are all hidden, or that is hidden itself', () => {
    expect(hiddenSteps({ business: true, promo: true })).toEqual([])
    expect(hiddenSteps({ business: false, promo: true })).toEqual(['company', 'done'])
  })

  it('drops a row whose fields are all hidden, but keeps text outside it', () => {
    expect(shown({ business: false }, 1)).toEqual(['heading'])
    expect(shown({ business: true }, 1)).toEqual(['heading', 'row', '  name:6', '  vat:6'])
  })

  it('drops a section that is hidden itself, even with only text in it', () => {
    expect(shown({ business: true, promo: false }, 2)).toEqual([
      'section code',
      '  paragraph',
      'section other',
      '  note',
    ])
  })

  it('keeps a section while a display element in it with conditions shows', () => {
    expect(shown({ business: false, promo: false }, 2)).toEqual(['section other', '  note'])
    expect(shown({ business: false, promo: true }, 2)).toEqual([
      'section promo',
      '  paragraph',
      'section code',
      '  code',
      'section other',
      '  note',
    ])
  })

  it('leaves out more fields with isShown', () => {
    const state = visibility.of({ business: true, promo: true })
    const nodes = state.shownNodes(
      steps[2]?.children ?? [],
      [],
      (node) => node.field.name !== 'note',
    )
    expect(outline(nodes)).toEqual([
      'section promo',
      '  paragraph',
      'section code',
      '  code',
      '  paragraph',
    ])
  })

  it('hides a field placed in a hidden section, and its display elements', () => {
    const state = visibility.of({ business: true, promo: false })
    const promo = steps[2]?.children[0] as LayoutNode & { type: 'section' }
    const paragraph = (promo.children[0] as LayoutField).node
    expect(state.isHidden(paragraph, [])).toBe(true)
  })

  it('hides the fields of a group the layout splits only where they are placed', () => {
    const split: JsonForm = {
      ...form(
        { name: 'off', type: 'checkbox' },
        {
          name: 'address',
          type: 'group',
          fields: [
            { name: 'city', type: 'text', required: true },
            { name: 'zip', type: 'text', required: true },
          ],
        },
      ),
      layout: {
        items: [
          'off',
          { type: 'section', id: 'a', hideWhen: { field: 'off' }, items: ['address.city'] },
          { type: 'section', id: 'b', items: ['*'] },
        ],
      } as never,
    }
    const fields = builder.getFieldTree(split)
    const state = builder.getVisibility(split).of({ off: true })
    expect(state.isHidden(findField(fields, 'address.city'), [])).toBe(true)
    expect(state.isHidden(findField(fields, 'address.zip'), [])).toBe(false)
    expect(state.isHidden(findField(fields, 'address'), [])).toBe(false)
  })

  it("hides a section in an array's items by each item's fields", () => {
    const items: JsonForm = {
      ...form({
        name: 'lines',
        type: 'array',
        fields: [
          { name: 'kind', type: 'text' },
          { name: 'hours', type: 'number' },
        ],
      }),
      layout: {
        items: [
          {
            field: 'lines',
            items: [
              'kind',
              {
                type: 'section',
                hideWhen: { field: 'lines.*.kind', equals: 'product' },
                items: ['hours'],
              },
            ],
          },
        ],
      } as never,
    }
    const lines = builder.getLayout(items).steps[0]?.children[0] as LayoutField
    const state = builder
      .getVisibility(items)
      .of({ lines: [{ kind: 'product' }, { kind: 'service' }] })
    expect(outline(state.shownNodes(lines.children, [0]))).toEqual(['lines.*.kind'])
    expect(outline(state.shownNodes(lines.children, [1]))).toEqual([
      'lines.*.kind',
      'section',
      '  lines.*.hours',
    ])
  })
})
