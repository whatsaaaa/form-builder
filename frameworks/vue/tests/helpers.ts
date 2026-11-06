import { Form } from '@formisch/vue'
import type { JsonField, JsonForm } from '@whatsaaaa/form-builder-schema'
import {
  type FieldComponents,
  JsonFields,
  type JsonFormInstance,
  useJsonForm,
  type UseJsonFormOptions,
} from '@whatsaaaa/form-builder-vue'
import { type Component, createApp, defineComponent, h, nextTick } from 'vue'
import { onTestFinished, vi } from 'vitest'

export const form = (...fields: JsonField[]): JsonForm => ({ version: '1', fields })

/** Mounts `component` into a new element, and returns the element. */
export function mount(component: Component): HTMLElement {
  const root = document.createElement('div')
  document.body.append(root)
  createApp(component).mount(root)
  return root
}

/** Runs `setup` inside a mounted component, for composables that need one. */
export function withSetup<T>(setup: () => T): T {
  let result: T | undefined
  mount(
    defineComponent({
      setup() {
        result = setup()
        return () => null
      },
    }),
  )
  return result as T
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
  const submitted: unknown[] = []
  const jsonForm = withSetup(() => useJsonForm(json, options))
  const root = mount(
    defineComponent({
      setup() {
        return () =>
          h(
            Form as Component,
            { of: jsonForm.form, onSubmit: (output: unknown) => submitted.push(output) },
            { default: () => h(JsonFields, { of: jsonForm, components }) },
          )
      },
    }),
  )
  return { root, jsonForm: jsonForm as JsonFormInstance, submitted }
}

/** Waits until Formisch has validated and Vue has rendered the result. */
export async function settle() {
  await new Promise((resolve) => setTimeout(resolve))
  await nextTick()
}

/** Types `value` into the input inside the element at `path`, like a person would. */
export function type(root: HTMLElement, path: string, value: string) {
  const input = root.querySelector<HTMLInputElement>(`[data-path="${path}"] input`)
  if (!input) throw new Error(`No input at ${path}`)
  input.value = value
  input.dispatchEvent(new Event('input'))
}

/** Submits the form inside `root`, the way its submit button would. */
export async function submit(root: HTMLElement) {
  root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }))
  await settle()
}

/** The error shown in the element at `path`, if any. */
export const errorAt = (root: HTMLElement, path: string) =>
  root.querySelector(`[data-path="${path}"] > small`)?.textContent ?? null

/**
 * Hides Vue's warnings for the rest of the test, for a test that expects a setup function to throw:
 * Vue logs the error with every prop of the component, which buries the test output.
 */
export function silenceVueWarnings() {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  onTestFinished(() => warn.mockRestore())
}
