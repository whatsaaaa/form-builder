import { type FormStore, reset, setInput } from '@formisch/react'
import type { FillErrorInfo, Fills, FillsRun, FillsState } from '@whatsaaaa/form-builder-schema'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { readInput, watchInput } from './formisch-internals'

interface FillsOptions {
  initialInput?: unknown
  onFillError?(error: unknown, info: FillErrorInfo): void
}

const formsWithFills = new WeakSet<FormStore>()

/** True for a form `useJsonForm` made from a definition with fills. */
export const hasFills = (form: FormStore): boolean => formsWithFills.has(form)

/**
 * Runs the fills of the definition on `form`: once it is mounted, the fills of sources it starts
 * with, as the values it starts with, and then each new value of a trigger, wherever it comes
 * from, with Formisch's `setInput`. It watches the input outside React, like `useVisibility`, and
 * re-renders only when what is pending changes. It reads the initial input on the first render, and
 * `onFillError` on every render. Without fills, it watches nothing.
 */
export function useFills(
  form: FormStore,
  fills: Fills,
  options: FillsOptions,
): { run: FillsRun; state: FillsState } {
  const [{ run, errors }] = useState(() => {
    if (fills.active) formsWithFills.add(form)
    const errors = errorSink()
    // The paths come from the definition at runtime, so the schema's types can't check them.
    const run = fills.open(
      {
        getInput: () => readInput(form),
        setInput: (path, input) => setInput(form, { path, input } as never),
        setStartInput: (path, input) => reset(form, { path, initialInput: input } as never),
      },
      { given: options.initialInput, onError: errors.report },
    )
    return { run, errors }
  })
  useEffect(() => {
    errors.use(options)
  })
  useEffect(() => {
    if (!fills.active) return
    // In StrictMode it starts, stops and starts again: the second start runs what the stop aborted.
    run.start()
    // A change between the first render and now, like a field a component set as it mounted.
    run.update()
    const stop = watchInput(form, run.update)
    return () => {
      stop()
      run.stop()
    }
  }, [form, fills, run])
  const getState = () => run.state
  const state = useSyncExternalStore(run.subscribe, getState, getState)
  return { run, state }
}

/**
 * Where a run sends its errors: to the `onFillError` of the options of the last render, which
 * `use()` gives it, or thrown like an uncaught one without it. A fill reports only after the form
 * is mounted, so the options are there by then.
 */
function errorSink() {
  let latest: FillsOptions = {}
  return {
    use(options: FillsOptions) {
      latest = options
    },
    report(error: unknown, info: FillErrorInfo) {
      // Called on the options, so an `onFillError` method keeps its `this`.
      if (latest.onFillError) latest.onFillError(error, info)
      else throwLater(error)
    },
  }
}

/** Throws `error` like an uncaught one, without stopping what called it. */
function throwLater(error: unknown): void {
  queueMicrotask(() => {
    throw error
  })
}
