import type { FormStore } from '@formisch/react'
import {
  getFieldInput,
  INTERNAL,
  type Listener,
  setListener,
  untrack,
} from '@formisch/react/internals'
import type { Visibility, VisibilityState } from '@whatsaaaa/form-builder-schema'
import { useCallback, useSyncExternalStore } from 'react'

/**
 * What the conditions of the definition hide for the form's input, as it changes. Formisch
 * re-renders a component for each signal it reads, so reading the whole input in `useJsonForm`
 * would re-render the form on every keystroke. This watches the input outside React instead, and
 * re-renders only when the state changes: `of()` gives the same object until then. Without
 * conditions, it watches nothing.
 */
export function useVisibility(form: FormStore, visibility: Visibility): VisibilityState {
  const subscribe = useCallback(
    (onChange: () => void) => (visibility.conditional ? watchInput(form, onChange) : () => {}),
    [form, visibility],
  )
  const getSnapshot = () =>
    visibility.of(visibility.conditional ? untrack(() => getFieldInput(form[INTERNAL])) : undefined)
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Calls `onChange` after each change of the form's input, until the function it returns is called.
 * It reads the input as Formisch's own components do, with a listener: a signal that changes calls
 * it once, so it reads the input again each time, the items of new array items too.
 */
function watchInput(form: FormStore, onChange: () => void): () => void {
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
