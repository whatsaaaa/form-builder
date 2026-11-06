import type { JsonField, JsonForm } from '@whatsaaaa/form-builder-schema'
import { createApp, defineComponent, type Component } from 'vue'

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

/** Waits until Formisch has validated and Vue has rendered the result. */
export const settle = () => new Promise((resolve) => setTimeout(resolve))
