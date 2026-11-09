// The scenarios in @formisch/qwik, through the renderer the schema package's docs show. Qwik's
// optimizer compiles the components, and render() renders them on the client, like in an app with
// no server rendering. The real qwikloader runs the handlers, so the elements get real events.
import '@qwik.dev/core/qwikloader.js'
import { render as renderQwik } from '@qwik.dev/core'
import {
  _waitUntilRendered,
  _whenContainerDataReady,
  getDomContainer,
} from '@qwik.dev/core/internal'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { describe, onTestFinished } from 'vitest'
import { type RenderedForm, runScenarios } from '../../tests/run-scenarios'
import { JsonFormView } from './json-form-view'

async function render(json: JsonForm): Promise<RenderedForm> {
  const root = document.createElement('div')
  document.body.append(root)
  const submitted: unknown[] = []
  const { cleanup } = await renderQwik(
    root,
    <JsonFormView
      json={json}
      onSubmit$={(output) => void submitted.push(output)}
      slots={{
        shipping: <p data-slot="shipping">Ships in three days</p>,
        submit: (
          <button type="submit" data-slot="submit">
            Place order
          </button>
        ),
      }}
    />,
  )
  onTestFinished(() => {
    cleanup()
    root.remove()
  })

  // Qwik holds back every event until the container has processed its data, which it does in
  // later turns of the event loop. Waits for that, so settle() sees the first event's handler run.
  const container = getDomContainer(root)
  await _whenContainerDataReady(container, () => {})

  // Handlers, Formisch's validation and a component waiting for its form all run asynchronously,
  // and each can make Qwik render again. Waits until a turn of the event loop changes nothing.
  const settle = async () => {
    for (let html = ''; html !== root.innerHTML;) {
      html = root.innerHTML
      await new Promise((resolve) => setTimeout(resolve))
      await _waitUntilRendered(container)
    }
  }
  await settle()

  return {
    root,
    submitted,
    async update(change) {
      change()
      await settle()
    },
  }
}

describe('the fixtures in @formisch/qwik, with the documented renderer', () => {
  runScenarios(render)
})
