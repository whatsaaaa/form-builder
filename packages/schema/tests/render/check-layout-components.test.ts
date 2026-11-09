import { describe, expect, it } from 'vitest'
import {
  allLayoutNodes,
  checkLayoutComponents,
  createSchemaBuilder,
  type JsonForm,
} from '@whatsaaaa/form-builder-schema'

const { getLayout } = createSchemaBuilder()

const json: JsonForm = {
  version: '1',
  fields: [{ name: 'a', type: 'text' }],
  layout: {
    steps: [
      {
        items: [
          {
            type: 'section',
            items: [{ type: 'row', items: ['a', { type: 'slot', name: 'submit' }] }],
          },
        ],
      },
      {
        items: [
          { type: 'slot', name: 'summary' },
          { type: 'section', items: [{ type: 'divider' }] },
        ],
      },
    ],
  },
}
const layout = getLayout(json)

describe('checkLayoutComponents', () => {
  it('passes when every layout type has a component and every slot content', () => {
    expect(() =>
      checkLayoutComponents(layout, { section: 1, row: 2 }, { submit: 3, summary: 4 }),
    ).not.toThrow()
  })

  it('needs nothing for a layout without sections, rows or slots', () => {
    expect(() =>
      checkLayoutComponents(getLayout({ ...json, layout: undefined }), {}, {}),
    ).not.toThrow()
  })

  it('names every missing layout type and slot once, on every step', () => {
    expect(() => checkLayoutComponents(layout, {}, {})).toThrow(
      new TypeError(
        'No component for the layout types "section", "row". Add them to the layout components. No content for the slots "submit", "summary". Pass them to the renderer.',
      ),
    )
    expect(() => checkLayoutComponents(layout, { section: 1 }, { submit: 1 })).toThrow(
      new TypeError(
        'No component for the layout type "row". Add it to the layout components. No content for the slot "summary". Pass it to the renderer.',
      ),
    )
  })

  it('reads only own keys', () => {
    expect(() =>
      checkLayoutComponents(layout, Object.create({ section: 1, row: 1 }), {
        submit: 1,
        summary: 1,
      }),
    ).toThrow(TypeError)
  })
})

describe('allLayoutNodes', () => {
  it('gives every node, a container before its items', () => {
    const [step] = layout.steps
    expect([...allLayoutNodes(step!.children)].map((node) => node.type)).toEqual([
      'section',
      'row',
      'field',
      'slot',
    ])
  })
})
