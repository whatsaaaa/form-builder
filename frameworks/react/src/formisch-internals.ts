// The parts of Formisch the adapter reads that Formisch keeps out of its public API, and so out of
// semver: its store, and `@formisch/react/internals`. tests/formisch-internals.test.tsx fails if a
// Formisch release moves them.
import type { FormStore } from '@formisch/react'
import {
  getFieldInput,
  INTERNAL,
  type Listener,
  setListener,
  untrack,
} from '@formisch/react/internals'

/** The `<form>` Formisch's `<Form>` renders, which it keeps on the store for its `submit()`. */
export function formElementOf(form: FormStore): HTMLFormElement | undefined {
  return (form as unknown as { '~internal'?: { element?: HTMLFormElement } })['~internal']?.element
}

/** The form's input, read without subscribing the component that may be rendering now. */
export const readInput = (form: FormStore): unknown => untrack(() => getFieldInput(form[INTERNAL]))

/**
 * Calls `onChange` after each change of the form's input, until the function it returns is called.
 * It reads the input as Formisch's own components do, with a listener: a signal that changes calls
 * it once, so it reads the input again each time, the items of new array items too.
 */
export function watchInput(form: FormStore, onChange: () => void): () => void {
  const listener: Listener = [
    () => {
      read()
      onChange()
    },
    new Set(),
  ]
  const stop = () => {
    for (const subscribers of listener[1]) subscribers.delete(listener)
    listener[1].clear()
  }
  function read() {
    stop()
    // untrack() sets back the listener of a component that may be rendering now.
    untrack(() => {
      setListener(listener)
      try {
        getFieldInput(form[INTERNAL])
      } finally {
        setListener(undefined)
      }
    })
  }
  read()
  return stop
}
