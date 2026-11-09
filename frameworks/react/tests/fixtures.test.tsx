import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { describe, expect, it } from 'vitest'
import { builtInComponents } from './components'
import { fixtures } from './fixtures'
import { mountForm, submit } from './helpers'

describe('the shared fixtures', () => {
  it.each(Object.keys(fixtures))('renders every field of the %s fixture', (name) => {
    const { root, jsonForm } = mountForm(fixtures[name] as JsonForm, builtInComponents)
    const roles = [...root.querySelectorAll<HTMLElement>('form > [data-role]')].map(
      (element) => element.dataset.role,
    )

    expect(roles).toEqual(jsonForm.fields.map((node) => node.role))
  })

  it.each(Object.keys(fixtures))('submits or reports issues for the %s fixture', async (name) => {
    const { root, submitted } = mountForm(fixtures[name] as JsonForm, builtInComponents)
    await submit(root)

    // A fixture with required fields is invalid when empty, and shows a message instead.
    const messages = root.querySelectorAll('small')
    expect(submitted.length + messages.length > 0).toBe(true)
  })
})
