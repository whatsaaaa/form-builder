// The scenarios in @formisch/svelte, through the renderer the schema package's docs show.
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { createRawSnippet, flushSync, mount, unmount } from 'svelte'
import { describe, onTestFinished } from 'vitest'
import { type RenderedForm, runScenarios } from '../../tests/run-scenarios'
import JsonFormView from './JsonFormView.svelte'

/** A snippet of `html`, for the content of a slot. */
const snippet = (html: string) => createRawSnippet(() => ({ render: () => html }))

const slots = {
  shipping: snippet('<p data-slot="shipping">Ships in three days</p>'),
  submit: snippet('<button type="submit" data-slot="submit">Place order</button>'),
}

function render(json: JsonForm): RenderedForm {
  const root = document.createElement('div')
  document.body.append(root)
  const submitted: unknown[] = []
  const component = mount(JsonFormView, {
    target: root,
    props: { json, onsubmit: (output) => submitted.push(output), slots },
  })
  onTestFinished(async () => {
    await unmount(component)
    root.remove()
  })

  return {
    root,
    submitted,
    async update(change) {
      change()
      // Formisch validates asynchronously. Then Svelte renders what changed.
      await new Promise((resolve) => setTimeout(resolve))
      flushSync()
    },
  }
}

describe('the fixtures in @formisch/svelte, with the documented renderer', () => {
  runScenarios(render)
})
