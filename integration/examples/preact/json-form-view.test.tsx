// The scenarios in @formisch/preact, through the renderer the schema package's docs show.
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { render as renderPreact } from 'preact'
import { act } from 'preact/test-utils'
import { describe, onTestFinished } from 'vitest'
import { type RenderedForm, runScenarios } from '../../tests/run-scenarios'
import { JsonFormView } from './json-form-view'

function render(json: JsonForm): RenderedForm {
  const root = document.createElement('div')
  document.body.append(root)
  const submitted: unknown[] = []
  act(() =>
    renderPreact(<JsonFormView json={json} onSubmit={(output) => submitted.push(output)} />, root),
  )
  onTestFinished(() => {
    act(() => renderPreact(null, root))
    root.remove()
  })

  return {
    root,
    submitted,
    async update(change) {
      // Formisch validates asynchronously.
      await act(async () => {
        change()
        await new Promise((resolve) => setTimeout(resolve))
      })
    },
  }
}

describe('the fixtures in @formisch/preact, with the documented renderer', () => {
  runScenarios(render)
})
