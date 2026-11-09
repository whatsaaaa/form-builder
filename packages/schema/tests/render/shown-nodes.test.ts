import { describe, expect, it } from 'vitest'
import {
  createSchemaBuilder,
  dotPathOf,
  type FieldNode,
  type IsFieldShown,
  type JsonForm,
  shownNodes,
  shownSteps,
} from '@whatsaaaa/form-builder-schema'
import { outline } from '../helpers'

const json: JsonForm = {
  version: '1',
  fields: [
    { name: 'city', type: 'text' },
    { name: 'zip', type: 'text' },
    { name: 'phone', type: 'text' },
    {
      name: 'company',
      type: 'group',
      fields: [
        { name: 'name', type: 'text' },
        { name: 'vat', type: 'text' },
      ],
    },
    {
      name: 'lines',
      type: 'array',
      fields: [
        { name: 'product', type: 'text' },
        { name: 'note', type: 'text' },
      ],
    },
  ],
  layout: {
    steps: [
      {
        items: [
          { type: 'row', id: 'place', items: [{ field: 'city', span: 8 }, 'zip'] },
          {
            type: 'section',
            id: 'contact',
            items: [{ type: 'heading', text: 'Call us' }, 'phone'],
          },
          {
            type: 'section',
            id: 'about',
            items: [
              { type: 'paragraph', text: 'Only text' },
              { type: 'slot', name: 'help' },
            ],
          },
        ],
      },
      { items: ['company'] },
      { items: [{ type: 'paragraph', text: 'Thanks' }] },
      { items: ['lines'] },
    ],
  },
}

const { steps } = createSchemaBuilder().getLayout(json)
const [first, company, thanks, lines] = steps

const hiding =
  (...paths: string[]): IsFieldShown =>
  (node: FieldNode) =>
    !paths.includes(dotPathOf(node) ?? '')

describe('shownNodes', () => {
  it('gives the same nodes when every field is shown', () => {
    const nodes = shownNodes(first!.children, [], () => true)
    expect(nodes).toEqual(first!.children)
    expect(nodes[0]).toBe(first!.children[0])
  })

  it('drops a hidden cell, and the other cells of its row keep their spans', () => {
    expect(outline(shownNodes(first!.children, [], hiding('city'))).slice(0, 2)).toEqual([
      'row place',
      '  zip:4',
    ])
  })

  it('drops a row or a section whose fields are all hidden, even with text in it', () => {
    expect(outline(shownNodes(first!.children, [], hiding('city', 'zip', 'phone')))).toEqual([
      'section about',
      '  paragraph',
      '  slot help',
    ])
  })

  it('drops a group whose fields are all hidden, and keeps one with a field left', () => {
    expect(shownNodes(company!.children, [], hiding('company.name', 'company.vat'))).toEqual([])
    expect(outline(shownNodes(company!.children, [], hiding('company.vat')))).toEqual([
      'company',
      '  company.name',
    ])
  })

  it('drops a hidden group with its fields', () => {
    expect(shownNodes(company!.children, [], hiding('company'))).toEqual([])
  })

  it("leaves an array's items to a call per item, with the item's indexes", () => {
    const seen: [string, readonly number[]][] = []
    const isShown: IsFieldShown = (node, indexes) => {
      seen.push([node.dataPath.join('.'), indexes])
      return !(dotPathOf(node) === 'lines.*.note' && indexes[0] === 1)
    }
    const [array] = shownNodes(lines!.children, [], isShown)

    expect(outline([array!])).toEqual(['lines', '  lines.*.product', '  lines.*.note'])
    expect(
      outline(shownNodes(array!.type === 'slot' ? [] : array!.children, [1], isShown)),
    ).toEqual(['lines.*.product'])
    expect(seen).toEqual([
      ['lines', []],
      ['lines.*.product', [1]],
      ['lines.*.note', [1]],
    ])
  })
})

describe('shownSteps', () => {
  it('leaves out a step whose fields are all hidden, and keeps one with only text', () => {
    expect(shownSteps(steps, hiding('company'))).toEqual([first, thanks, lines])
    expect(shownSteps(steps, () => true)).toEqual(steps)
  })
})
