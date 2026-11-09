// The scenarios in @formisch/solid, through the renderer the schema package's docs show.
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { render as renderSolid } from 'solid-js/web'
import { describe, onTestFinished } from 'vitest'
import { type RenderedForm, runScenarios } from '../../tests/run-scenarios'
import { JsonFormView } from './json-form-view'

function render(json: JsonForm): RenderedForm {
  const root = document.createElement('div')
  document.body.append(root)
  const submitted: unknown[] = []
  const dispose = renderSolid(
    () => <JsonFormView json={json} onSubmit={(output) => submitted.push(output)} />,
    root,
  )
  onTestFinished(() => {
    dispose()
    root.remove()
  })

  return {
    root,
    submitted,
    async update(change) {
      change()
      // Formisch validates asynchronously, and Solid updates the DOM as signals change.
      await new Promise((resolve) => setTimeout(resolve))
    },
  }
}

describe('the fixtures in @formisch/solid, with the documented renderer', () => {
  runScenarios(render)
})
