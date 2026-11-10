// Guards for the parts of Formisch the adapter reads that Formisch keeps out of semver, all in
// src/formisch-internals.ts. When one of these fails after a Formisch release, that file needs
// updating: the other tests may only show a symptom, like a submit before the last step that
// sends the form.
import { describe, expect, it } from 'vitest'
import { builtInComponents } from './components'
import { form, mountForm } from './helpers'

describe('the Formisch internals the adapter reads', () => {
  it("include the <form> Formisch's <Form> renders, on the store", () => {
    const { root, jsonForm } = mountForm(form({ name: 'name', type: 'text' }), builtInComponents)
    const store = jsonForm.form as unknown as { '~internal'?: { element?: unknown } }

    expect(root.querySelector('form')).toBeInstanceOf(HTMLFormElement)
    expect(store['~internal']?.element).toBe(root.querySelector('form'))
  })
})
