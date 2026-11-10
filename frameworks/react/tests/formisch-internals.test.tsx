// Guards for the parts of Formisch the adapter reads that Formisch keeps out of semver, all in
// src/formisch-internals.ts. When one of these fails after a Formisch release, that file needs
// updating: the other tests may only show a symptom, like a submit before the last step that
// sends the form.
import { insert, setInput } from '@formisch/react'
import * as internals from '@formisch/react/internals'
import { affects } from '@whatsaaaa/form-builder-affects'
import { createSchemaBuilder, type JsonForm } from '@whatsaaaa/form-builder-schema'
import { JsonFields } from '@whatsaaaa/form-builder-react'
import { describe, expect, it } from 'vitest'
import order from '../../../fixtures/affects/order.json'
import { builtInComponents } from './components'
import { form, mountForm, mountLayout, update } from './helpers'

/** The paths of the value fields on show, in order. */
const shown = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>('[data-role="value"]')].map(
    (element) => element.dataset['path'],
  )

describe('the Formisch internals the adapter reads', () => {
  it('include what @formisch/react/internals exports to read and watch the input', () => {
    expect(internals.INTERNAL).toBe('~internal')
    expect(internals.getFieldInput).toBeTypeOf('function')
    expect(internals.setListener).toBeTypeOf('function')
    expect(internals.untrack).toBeTypeOf('function')
  })

  it("include the <form> Formisch's <Form> renders, on the store", () => {
    const { root, jsonForm } = mountForm(form({ name: 'name', type: 'text' }), builtInComponents)
    const store = jsonForm.form as unknown as { '~internal'?: { element?: unknown } }

    expect(root.querySelector('form')).toBeInstanceOf(HTMLFormElement)
    expect(store['~internal']?.element).toBe(root.querySelector('form'))
  })

  it('include a subscription to the input that sees every change, in new array items too', async () => {
    const { root, jsonForm } = mountLayout(
      order as JsonForm,
      (jsonForm) => <JsonFields of={jsonForm} />,
      { builder: createSchemaBuilder({ extensions: [affects()] }), components: builtInComponents },
    )
    expect(shown(root)).toEqual(['isGift'])

    await update(() => insert(jsonForm.form, { path: ['lines'] } as never))
    await update(() =>
      setInput(jsonForm.form, { path: ['lines', 0, 'kind'], input: 'service' } as never),
    )
    expect(shown(root)).toEqual(['isGift', 'lines.0.kind', 'lines.0.quantity', 'lines.0.hours'])

    await update(() =>
      setInput(jsonForm.form, { path: ['lines', 0, 'kind'], input: 'product' } as never),
    )
    expect(shown(root)).toEqual(['isGift', 'lines.0.kind', 'lines.0.sku', 'lines.0.quantity'])
  })
})
