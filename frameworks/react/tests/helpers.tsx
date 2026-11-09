import { Form } from '@formisch/react'
import type { JsonField, JsonForm } from '@whatsaaaa/form-builder-schema'
import {
  type FieldComponents,
  JsonFields,
  type JsonFormInstance,
  useJsonForm,
  type UseJsonFormOptions,
} from '@whatsaaaa/form-builder-react'
import { act, type ReactNode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { onTestFinished, vi } from 'vitest'

// Tells React that the tests wrap their updates in act().
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

export const form = (...fields: JsonField[]): JsonForm => ({ version: '1', fields })

/** Renders `node` into a new element, and returns the element. */
export function mount(node: ReactNode): HTMLElement {
  const root = document.createElement('div')
  document.body.append(root)
  const reactRoot = createRoot(root)
  onTestFinished(() => {
    act(() => reactRoot.unmount())
    root.remove()
  })
  act(() => reactRoot.render(node))
  return root
}

/** Calls `hook` in a mounted component, for hooks that need one, and gives what it returned. */
export function withHook<T>(hook: () => T): T {
  const result: { current?: T } = {}
  function Probe() {
    const value = hook()
    useEffect(() => {
      result.current = value
    })
    return null
  }
  mount(<Probe />)
  return result.current as T
}

/**
 * Mounts Formisch's `<Form>` with `<JsonFields>` in it, the way an app uses them. Gives the
 * element, the form, and every output it submitted.
 */
export function mountForm(
  json: JsonForm,
  components: FieldComponents,
  options?: UseJsonFormOptions,
) {
  return mountLayout(
    json,
    (jsonForm) => <JsonFields of={jsonForm} components={components} />,
    options,
  )
}

/**
 * Mounts Formisch's `<Form>` around what `layout` renders, with the form `useJsonForm` makes from
 * `json` and `options`. Gives the element, the form, and every output it submitted.
 */
export function mountLayout(
  json: JsonForm,
  layout: (jsonForm: JsonFormInstance) => ReactNode,
  options?: UseJsonFormOptions,
) {
  const submitted: unknown[] = []
  const instance: { current?: JsonFormInstance } = {}
  function App() {
    const jsonForm = useJsonForm(json, options)
    useEffect(() => {
      instance.current = jsonForm
    })
    return (
      <Form of={jsonForm.form} onSubmit={(output) => void submitted.push(output)}>
        {layout(jsonForm)}
      </Form>
    )
  }
  const root = mount(<App />)
  return { root, jsonForm: instance.current as JsonFormInstance, submitted }
}

/** Waits until Formisch has validated and React has rendered the result. */
export async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve))
  })
}

/** Runs `change`, like a call to a field's `setInput`, and waits until React has rendered it. */
export async function update(change: () => void) {
  await act(async () => {
    change()
    await new Promise((resolve) => setTimeout(resolve))
  })
}

/**
 * Types `value` into the input inside the element at `path`, like a person would: through the
 * value setter React watches, then the event a browser fires.
 */
export function type(root: HTMLElement, path: string, value: string) {
  const input = root.querySelector<HTMLInputElement>(`[data-path="${path}"] input`)
  if (!input) throw new Error(`No input at ${path}`)
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

/** Submits the form inside `root`, the way its submit button would. */
export async function submit(root: HTMLElement) {
  await update(() => {
    root
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

/** The error shown in the element at `path`, if any. */
export const errorAt = (root: HTMLElement, path: string) =>
  root.querySelector(`[data-path="${path}"] > small`)?.textContent ?? null

/**
 * Hides React's error logs for the rest of the test, for a test that expects a component to throw:
 * React logs the error and the component stack, which buries the test output.
 */
export function silenceReactErrors() {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  onTestFinished(() => error.mockRestore())
}

/** Mounts `node`, and gives what rendering it threw, or undefined. */
export function thrownBy(node: ReactNode): unknown {
  silenceReactErrors()
  try {
    mount(node)
  } catch (error) {
    return error
  }
  return undefined
}
