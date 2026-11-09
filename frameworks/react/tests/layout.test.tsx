import { Form, insert } from '@formisch/react'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import {
  JsonFields,
  type JsonFieldsProps,
  useJsonForm,
  type UseJsonFormOptions,
} from '@whatsaaaa/form-builder-react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import checkout from '../../../fixtures/layout/checkout.json'
import { builtInComponents, layoutComponents } from './components'
import { form, mountLayout, thrownBy, update } from './helpers'

const options: UseJsonFormOptions = { components: builtInComponents, layoutComponents }

const slots: Record<string, ReactNode> = {
  shipping: <p data-slot="shipping">Ships in 3 days</p>,
  submit: <button type="submit">Place order</button>,
}

/** Mounts `<JsonFields>` in Formisch's `<Form>`, with `props` of its own. */
function mountFields(
  json: JsonForm,
  props: Partial<JsonFieldsProps> = {},
  useOptions: UseJsonFormOptions = options,
) {
  return mountLayout(
    json,
    (jsonForm) => <JsonFields of={jsonForm} slots={slots} {...props} />,
    useOptions,
  )
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
  })

  it("renders each array item with the array's items", async () => {
    const { root, jsonForm } = mountFields(checkout as JsonForm)
    await update(() =>
      insert(jsonForm.form, { path: ['lines'] as never, initialInput: { quantity: 1 } as never }),
    )

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

  it('leaves out the fields `except` names, and a section left without fields', () => {
    const { root } = mountFields(checkout as JsonForm, {
      except: ['email', 'address', 'lines', 'name'],
    })
    const [row] = structure(root.querySelector('form') as Element) as { row: unknown[][] }[]
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
    const Plain = ({ children }: { children: ReactNode | ((index: number) => ReactNode) }) => (
      <div data-plain="">{typeof children === 'function' ? children(0) : children}</div>
    )
    const { root } = mountFields(checkout as JsonForm, {
      layoutComponents: { section: Plain, row: Plain },
    })
    expect(root.querySelectorAll('[data-plain]').length).toBeGreaterThan(0)
    expect(root.querySelector('[data-section]')).toBeNull()
  })

  it('throws for a layout type without a component, or a slot without content', () => {
    expect(
      String(
        thrownBy(<Probe json={checkout as JsonForm} options={{ components: builtInComponents }} />),
      ),
    ).toContain(
      'No component for the layout types "row", "section". Add them to the layout components.',
    )
    expect(String(thrownBy(<Probe json={checkout as JsonForm} slots={{}} />))).toContain(
      'No content for the slots "shipping", "submit".',
    )
  })

  it('throws for a field type without a component, in the layout too', () => {
    const json = {
      ...form({ name: 'a', type: 'text' }),
      layout: { items: [{ type: 'divider' }, '*'] },
    } as JsonForm
    const components = { text: builtInComponents['text'] as never }
    expect(String(thrownBy(<Probe json={json} options={{ components }} />))).toContain(
      'No component for the field type "divider"',
    )
  })

  it('renders the step `step` names', () => {
    const json: JsonForm = {
      ...form({ name: 'a', type: 'text' }, { name: 'b', type: 'text' }),
      layout: { steps: [{ items: ['a'] }, { items: ['b'] }] },
    }
    const { root } = mountFields(json, { step: 1 })
    expect(structure(root.querySelector('form') as Element)).toEqual(['b'])
    expect(String(thrownBy(<Probe json={json} step={2} />))).toContain('No step 2. The form has 2.')
  })

  it('renders a definition without a layout as before, with one step', () => {
    const json = form({ name: 'a', type: 'text' }, { type: 'divider' })
    const { root, jsonForm } = mountFields(json, {}, { components: builtInComponents })

    expect(structure(root.querySelector('form') as Element)).toEqual(['a', 'divider'])
    expect(jsonForm.steps.list).toHaveLength(1)
    expect(jsonForm.layout.steps[0]?.step).toEqual({ items: ['*'] })
  })
})

interface ProbeProps {
  json: JsonForm
  options?: UseJsonFormOptions
  slots?: Record<string, ReactNode>
  step?: number
}

/** A form that renders `<JsonFields>` for `json`, for tests that expect it to throw. */
function Probe({ json, options: own = options, slots: content = slots, step }: ProbeProps) {
  const jsonForm = useJsonForm(json, own)
  return (
    <Form of={jsonForm.form} onSubmit={() => {}}>
      <JsonFields of={jsonForm} slots={content} step={step} />
    </Form>
  )
}
