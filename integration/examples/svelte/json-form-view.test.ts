// The scenarios in @formisch/svelte, through the renderer the schema package's docs show.
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { flushSync, mount, unmount } from 'svelte'
import { describe, onTestFinished } from 'vitest'
import { type RenderedForm, runScenarios } from '../../tests/run-scenarios'
import JsonFormView from './JsonFormView.svelte'

function render(json: JsonForm): RenderedForm {
  const root = document.createElement('div')
  document.body.append(root)
  const submitted: unknown[] = []
  const component = mount(JsonFormView, {
    target: root,
    props: { json, onsubmit: (output) => submitted.push(output) },
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
