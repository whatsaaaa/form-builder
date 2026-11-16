import { type FormStore, reset, setInput } from '@formisch/react'
import type {
  FillErrorInfo,
  Fills,
  FillsRun,
  FillsState,
  OpenFillsOptions,
} from '@whatsaaaa/form-builder-schema'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { readInput, watchInput } from './formisch-internals'

interface FillsOptions {
  initialInput?: unknown
  onFillError?(error: unknown, info: FillErrorInfo): void
}

const formsWithFills = new WeakSet<FormStore>()

/** True for a form `useJsonForm` made from a definition with fills. */
export const hasFills = (form: FormStore): boolean => formsWithFills.has(form)

/** The fills of a form, for `useJsonForm`. */
export interface JsonFormFills {
  readonly run: FillsRun
  /** What is pending now. */
  readonly state: FillsState
  /**
   * Resets the form with `resetForm`, like Formisch's `reset`, then starts the fills again on the
   * input it holds, with `options` like the run's `reset()`. The fills don't see the input change
   * as the form resets, so they neither run nor blank fields for the values it goes back to.
   */
  reset(resetForm: () => void, options?: Pick<OpenFillsOptions, 'given'>): void
}

/**
 * Runs the fills of the definition on `form`: once it is mounted, the fills of sources it starts
 * with, as the values it starts with, and then each new value of a trigger, wherever it comes
 * from, with Formisch's `setInput`. It watches the input outside React, like `useVisibility`, and
 * re-renders only when what is pending changes. It reads the initial input on the first render, and
 * `onFillError` on every render. Without fills, it watches nothing.
 */
export function useFills(form: FormStore, fills: Fills, options: FillsOptions): JsonFormFills {
  const [{ run, errors, onInput, reset: resetFills }] = useState(() => {
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
    // Formisch tells its watchers of a reset at once, before the run hears of it: the fills would
    // take the values it goes back to as changes, and blank the fields of a trigger it clears.
    let resetting = false
    return {
      run,
      errors,
      onInput: () => {
        if (!resetting) run.update()
      },
      reset(resetForm: () => void, resetOptions?: Pick<OpenFillsOptions, 'given'>) {
        resetting = true
        try {
          resetForm()
        } finally {
          resetting = false
        }
        run.reset(resetOptions)
      },
    }
  })
  useEffect(() => {
    errors.use(options)
  })
  useEffect(() => {
    if (!fills.active) return
    // In StrictMode, or when an <Activity> hides the form and shows it again, it stops and starts
    // again: the second start runs again each fill the stop cancelled, whatever started it.
    run.start()
    // A change between the first render and now, like a field a component set as it mounted.
    run.update()
    const stop = watchInput(form, onInput)
    return () => {
      stop()
      run.stop()
    }
  }, [form, fills, run, onInput])
  const getState = () => run.state
  const state = useSyncExternalStore(run.subscribe, getState, getState)
  return { run, state, reset: resetFills }
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
