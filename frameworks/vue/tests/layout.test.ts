import { Form } from '@formisch/vue'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { JsonFields, useJsonForm, type UseJsonFormOptions } from '@whatsaaaa/form-builder-vue'
import { type Component, defineComponent, h, type Slots } from 'vue'
import { describe, expect, it } from 'vitest'
import checkout from '../../../fixtures/layout/checkout.json'
import { builtInComponents, layoutComponents, rows } from './components'
import { form, mount, silenceVueWarnings, withSetup } from './helpers'

const options: UseJsonFormOptions = { components: builtInComponents, layoutComponents }

const slots: Slots = {
  shipping: () => [h('p', { 'data-slot': 'shipping' }, 'Ships in 3 days')],
  submit: () => [h('button', { type: 'submit' }, 'Place order')],
}

/** Mounts `<JsonFields>` in Formisch's `<Form>`, with `props` and slots of its own. */
function mountFields(
  json: JsonForm,
  props: Record<string, unknown> = {},
  own: Slots = slots,
  useOptions: UseJsonFormOptions = options,
) {
  const jsonForm = withSetup(() => useJsonForm(json, useOptions))
  const root = mount(
    defineComponent({
      setup: () => () =>
        h(
          Form as Component,
          { of: jsonForm.form, onSubmit: () => {} },
          { default: () => h(JsonFields, { of: jsonForm, ...props }, own) },
        ),
    }),
  )
  return { root, jsonForm }
}

/**
 * What the form shows, as text: a section by its id, a row's cells by their spans, a field by
 * its path, a display element and a slot by their text.
 */
function structure(element: Element): unknown[] {
  return [...element.children].flatMap((child): unknown[] => {
    const html = child as HTMLElement
    if (html.dataset['section'] !== undefined) {
      return [{ section: html.dataset['section'], items: structure(child) }]
    }
    if (html.dataset['row'] !== undefined) {
      return [
        {
          row: [...child.children].map((cell) => [
            Number((cell as HTMLElement).dataset['span']),
            ...structure(cell),
          ]),
        },
      ]
    }
    if (html.dataset['role'] === 'value') return [html.dataset['path']]
    if (html.dataset['role'] === 'group')
      return [{ group: html.dataset['path'], items: structure(child) }]
    if (html.dataset['role'] === 'array')
      return [{ array: html.dataset['path'], items: structure(child) }]
    if (html.dataset['item'] !== undefined) return structure(child)
    if (child.tagName === 'P' || child.tagName === 'BUTTON') return [child.textContent]
    return []
  })
}

describe('rendering a layout', () => {
  it('renders sections, rows with their spans, groups and arrays laid out, and slots', () => {
    const { root } = mountFields(checkout as JsonForm)
    expect(structure(root.querySelector('form') as Element)).toEqual([
      {
        row: [
          [
            8,
            {
              section: 'delivery',
              items: [
                {
                  row: [
                    [6, 'name'],
                    [6, 'email'],
                  ],
                },
                {
                  group: 'address',
                  items: [
                    'address.street',
                    {
                      row: [
                        [8, 'address.city'],
                        [4, 'address.zip'],
                      ],
                    },
                  ],
                },
                { array: 'lines', items: [] },
              ],
            },
          ],
          [
            4,
            {
              section: 'summary',
              items: [
                'Ships in 3 days',
                'coupon',
                'newsletter',
                'acceptTerms',
                'We ship within three days.',
                'Place order',
              ],
            },
          ],
        ],
      },
    ])
    expect(rows.get('')?.row).toMatchObject({ type: 'row' })
  })

  it("renders each array item with the array's items", async () => {
    const { root, jsonForm } = mountFields(checkout as JsonForm)
    const { insert } = await import('@formisch/vue')
    insert(jsonForm.form, { path: ['lines'] as never, initialInput: { quantity: 1 } as never })
    await new Promise((resolve) => setTimeout(resolve))

    const lines = root.querySelector('[data-path="lines"]') as Element
    expect(structure(lines)).toEqual([
      {
        row: [
          [9, 'lines.0.product'],
          [3, 'lines.0.quantity'],
        ],
      },
    ])
  })

  it('renders a display element written in the layout with your field components', () => {
    const json = form({ name: 'a', type: 'text' })
    const { root } = mountFields({
      ...json,
      layout: { items: [{ type: 'heading', text: 'Hi' }, '*'] },
    })

    expect(structure(root.querySelector('form') as Element)).toEqual(['Hi', 'a'])
  })

  it('leaves out the fields `except` names, and a row cell, and a section left without fields', () => {
    const { root } = mountFields(checkout as JsonForm, {
      except: ['email', 'address', 'lines', 'name'],
    })
    const [row] = structure(root.querySelector('form') as Element) as { row: unknown[][] }[]

    // The delivery section had nothing else, and the summary keeps its span.
    expect(row?.row.map(([span]) => span)).toEqual([4])
  })

  it('keeps the spans of the cells left in a row', () => {
    const { root } = mountFields(checkout as JsonForm, { except: ['address.city'] })
    expect(root.querySelector('[data-path="address"] [data-row]')?.outerHTML).toContain(
      'data-span="4"',
    )
    expect(root.querySelectorAll('[data-path="address"] [data-span]')).toHaveLength(1)
  })

  it('renders only the fields `only` names, in the order of the definition, without the layout', () => {
    const { root } = mountFields(checkout as JsonForm, { only: ['coupon', 'name'] })
    expect(structure(root.querySelector('form') as Element)).toEqual(['name', 'coupon'])
  })

  it('takes layout components as a prop, which wins', () => {
    const Plain = defineComponent({
      setup:
        (_, { slots: own }) =>
        () =>
          h('div', { 'data-plain': '' }, own.default?.({ index: 0 })),
    })
    const { root } = mountFields(checkout as JsonForm, {
      layoutComponents: { section: Plain, row: Plain },
    })
    expect(root.querySelectorAll('[data-plain]').length).toBeGreaterThan(0)
    expect(root.querySelector('[data-section]')).toBeNull()
  })

  it('throws at setup for a layout type without a component, or a slot without content', () => {
    silenceVueWarnings()
    expect(() =>
      mountFields(checkout as JsonForm, {}, slots, { components: builtInComponents }),
    ).toThrow(
      'No component for the layout types "row", "section". Add them to the layout components.',
    )
    expect(() => mountFields(checkout as JsonForm, {}, {})).toThrow(
      'No content for the slots "shipping", "submit".',
    )
  })

  it('throws at setup for a field type without a component, in the layout too', () => {
    silenceVueWarnings()
    const json = form({ name: 'a', type: 'text' })
    const components = { text: builtInComponents['text'] as Component }
    expect(() =>
      mountFields(
        { ...json, layout: { items: [{ type: 'divider' }, '*'] } },
        {},
        {},
        { components },
      ),
    ).toThrow('No component for the field type "divider"')
  })

  it('renders a definition without a layout without layout components', () => {
    const json = form({ name: 'a', type: 'text' }, { type: 'divider' })
    const { root, jsonForm } = mountFields(json, {}, {}, { components: builtInComponents })

    expect(structure(root.querySelector('form') as Element)).toEqual(['a', 'divider'])
    expect(jsonForm.steps.list).toHaveLength(1)
    expect(jsonForm.layout.steps[0]?.step).toEqual({ items: ['*'] })
  })
})
