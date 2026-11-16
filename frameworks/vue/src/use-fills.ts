import { type FormStore, getInput, reset, setInput } from '@formisch/vue'
import type {
  FillErrorInfo,
  FillsState,
  JsonForm,
  SchemaBuilder,
} from '@whatsaaaa/form-builder-schema'
import {
  getCurrentInstance,
  getCurrentScope,
  onMounted,
  onScopeDispose,
  shallowRef,
  watch,
} from 'vue'

/** The fills of a form, for `useJsonForm` and its steps. */
export interface JsonFormFills {
  /** What is pending now. Reactive. */
  readonly state: { readonly value: FillsState }
  /** Resolves once no fill is pending. */
  settled(): Promise<void>
}

const withFills = new WeakMap<FormStore, JsonFormFills>()

/** The fills of `form`, for its fields' `pending` prop. Undefined in a form without fills. */
export const fillsOf = (form: FormStore): JsonFormFills | undefined => withFills.get(form)

/**
 * Runs the definition's fills on `form`: each new value of a trigger sets the fields of its fill,
 * with Formisch's `setInput`, and values that come while the form loads are set as the ones it
 * starts with, with Formisch's `reset`, so they don't make it dirty. They start once the form is
 * mounted, so never on a server, and stop when its scope is disposed.
 */
export function useFills(
  form: FormStore,
  builder: SchemaBuilder,
  definition: JsonForm,
  options: {
    initialInput?: unknown
    onFillError?: ((error: unknown, info: FillErrorInfo) => void) | undefined
  },
): JsonFormFills {
  const fills = builder.getFills(definition)
  const run = fills.open(
    {
      getInput: () => getInput(form),
      // The paths come from the definition at runtime, so the schema's types can't check them.
      setInput: (path, input) => setInput(form, { path, input } as never),
      setStartInput: (path, input) => reset(form, { path, initialInput: input } as never),
    },
    {
      given: options.initialInput,
      // Without it, the run throws each error like an uncaught one. Called on `options`, so a
      // method keeps its `this`.
      onError: options.onFillError && ((error, info) => options.onFillError?.(error, info)),
    },
  )
  const state = shallowRef(run.state)
  const result: JsonFormFills = { state, settled: () => run.settled() }
  // Without fills, nothing is ever pending, so the input isn't watched.
  if (!fills.active) return result

  run.subscribe(() => {
    state.value = run.state
  })
  watch(
    fills.triggers.map((path) => () => getInput(form, { path } as never)),
    () => run.update(),
  )
  if (getCurrentInstance()) onMounted(() => run.start())
  else run.start()
  if (getCurrentScope()) onScopeDispose(() => run.stop())
  withFills.set(form, result)
  return result
}
