import type { FormStore } from '@formisch/react'
import type { Visibility, VisibilityState } from '@whatsaaaa/form-builder-schema'
import { useCallback, useSyncExternalStore } from 'react'
import { readInput, watchInput } from './formisch-internals'

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
  const getSnapshot = () => visibility.of(visibility.conditional ? readInput(form) : undefined)
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
