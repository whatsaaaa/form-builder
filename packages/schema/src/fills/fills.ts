import type { FillResult, FillTriggerValue } from '../extensions/schema-extension'
import { coerceInput } from '../render/coerce-input'
import type { FieldPath } from '../render/to-field-path'
import { createAbortController, throwLater, type WebAbortController } from '../shared/web-globals'
import { type Engine, valueAt } from '../visibility/engine'
import { update } from '../visibility/gate'
import { clearFields } from '../visibility/visibility'
import type { FillField, FillPlan, PlannedFill } from './fill-plan'
import { blankOf, fit, show } from './fit'
import { isGiven } from './is-given'

/**
 * The fills of a definition, as the builder's `getFills(json)` gives them: what a form starts
 * with, and what runs while it is open.
 */
export interface Fills {
  /** True when the definition has fills. When false, `open()` gives a run that does nothing. */
  readonly active: boolean
  /** The Formisch path of each trigger, in document order: watch them to call `update()`. */
  readonly triggers: readonly FieldPath[]
  /**
   * The input a form starts with: `input`, the defaults with the app's initial input over them,
   * with the values of each static fill, like a map, whose trigger starts from the definition with
   * a value. They leave alone the fields `given`, the app's initial input, has a key for. A field
   * the conditions clear, as the form starts or for those values, is blank, even when a later
   * value ends the clear, and a trigger they clear keeps none of its fills' values, whatever the
   * order of the fields. It throws what the static fills' `values()` throw, and a TypeError when
   * they give a promise, or no object of values. Apply the conditions' `clear()` after it. The
   * builder's `getInitialInput()` does all of it already.
   */
  initialInput<T>(input: T, given: unknown): T
  /** Starts the fills of one form. Call `start()` on the run once the form is on the page. */
  open(form: FillsForm, options?: OpenFillsOptions): FillsRun
}

/** How fills read and set one form, like a Formisch form. */
export interface FillsForm {
  /** The form's input now, like Formisch's `getInput(form)`, read without subscribing. */
  getInput(): unknown
  /** Sets a field's input as a change, like Formisch's `setInput`. */
  setInput(path: FieldPath, input: unknown): void
  /**
   * Sets a field's input as the one it starts with, so it isn't a change, like Formisch's
   * `reset(form, { path, initialInput })`.
   */
  setStartInput(path: FieldPath, input: unknown): void
}

export interface OpenFillsOptions {
  /**
   * The initial input the app gave the form, like `useJsonForm`'s `initialInput`. A trigger it has
   * a key for starts no fill, and the fills that run as the form starts leave the fields it has a
   * key for alone.
   */
  readonly given?: unknown
  /**
   * Called with each error of a fill: what its values threw or rejected with, or a TypeError when
   * they are no object of values, or a value its field can't hold. Without it, the error is thrown
   * in a microtask, like an uncaught one.
   */
  onError?(error: unknown, info: FillErrorInfo): void
}

/** Where an error of a fill comes from. */
export interface FillErrorInfo {
  /** The trigger's dot path, like `'profile'`. */
  readonly trigger: string
  /** The value of the trigger the fill ran for. */
  readonly value: FillTriggerValue
  /** For a value its field can't hold: that field's dot path. */
  readonly field?: string
}

/** The fills of one open form. */
export interface FillsRun {
  /** What is pending now. A new object only when that changes. */
  readonly state: FillsState
  /** Calls `listener` after each change of `state`, until the function it returns is called. */
  subscribe(listener: () => void): () => void
  /**
   * Runs the fills the form starts with that aren't static, like those of sources. Call it once
   * the form is on the page, never on a server. After `stop()`, it runs those that didn't finish.
   */
  start(): void
  /**
   * Call it after the form's input changes: each trigger with a new value runs its fill, and each
   * trigger that lost its value blanks every field its fills set.
   */
  update(): void
  /** Resolves once no fill is pending, including the fills that those start. */
  settled(): Promise<void>
  /** Cancels the fills pending now, e.g. when the form closes. */
  stop(): void
}

/** What the fills of a form are waiting for now. */
export interface FillsState {
  /** The dot path of each trigger whose fill waits for its values, in document order. */
  readonly pending: readonly string[]
  /** True while a fill waits for the value of the field at `path`: as its trigger, or a field it sets. */
  isPending(path: FieldPath): boolean
}

const NOTHING_PENDING: FillsState = { pending: [], isPending: () => false }

const IDLE: FillsRun = {
  state: NOTHING_PENDING,
  subscribe: () => () => {},
  start() {},
  update() {},
  settled: () => Promise.resolve(),
  stop() {},
}

/** The fills of a definition without any, or of a builder without extensions. */
export const NO_FILLS: Fills = {
  active: false,
  triggers: [],
  initialInput: (input) => input,
  open: () => IDLE,
}

/** The fills of `plan`, or of a definition without any when there is none. */
export function createFills(plan: FillPlan | undefined, engine: Engine | undefined): Fills {
  if (!plan?.fills.length) return NO_FILLS
  const conditions = engine?.conditional ? engine : undefined
  return {
    active: true,
    triggers: plan.triggers.map((trigger) => trigger.path),
    initialInput: (input, given) => fillInitialInput(plan, conditions, input, given),
    open: (form, options = {}) => openFills(plan, conditions, form, options),
  }
}

/** True for a field its conditions clear for `input`: it is about to be blank. */
type IsCleared = (field: FillField) => boolean

const NONE_CLEARED: IsCleared = () => false

function clearedIn(engine: Engine | undefined, input: unknown): IsCleared {
  if (!engine) return NONE_CLEARED
  const evaluation = engine.evaluate(input)
  return (field) => {
    const unit = engine.unitAt(field.definitionPath)
    return !!unit && evaluation.stateOf(unit, []).clear
  }
}

/**
 * The value of a trigger, as a fill gets it, or undefined when it is empty: blank, or cleared by
 * its conditions.
 */
function triggerValue(
  trigger: FillField,
  input: unknown,
  isCleared: IsCleared,
): FillTriggerValue | undefined {
  if (isCleared(trigger)) return undefined
  const value = coerceInput(valueAt(input, trigger.path), trigger)
  const scalar =
    typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
  return scalar && !trigger.kindDef.isEmpty(value) ? value : undefined
}

/** `input` with `value` at `path`, which is left out when it is undefined. */
function setAt(input: unknown, path: FieldPath, value: unknown): unknown {
  if (value === undefined) return clearFields(input, [{ path, input: undefined }])
  return update(input, path, () => value)
}

const inputOf = (input: unknown): Readonly<Record<string, unknown>> =>
  typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  ((typeof value === 'object' && value !== null) || typeof value === 'function') &&
  typeof (value as { then?: unknown }).then === 'function'

/** The values of a result: null and undefined have none. Anything but an object is undefined. */
function valuesOf(result: unknown): Readonly<Record<string, unknown>> | undefined {
  if (result === null || result === undefined) return {}
  if (typeof result !== 'object' || Array.isArray(result)) return undefined
  return result as Record<string, unknown>
}

const notValues = (fill: PlannedFill, result: unknown) =>
  new TypeError(
    `The fill of "${fill.trigger.dotPath}" gave ${show(result)}, not an object of values`,
  )

/** The value a fill gives a field, by its dot path. A key the fill doesn't set is ignored. */
const rawOf = (values: Readonly<Record<string, unknown>>, field: FillField): unknown =>
  Object.hasOwn(values, field.dotPath) ? values[field.dotPath] : undefined

/** The same input: the same value, the same items, or both empty. */
function holds(field: FillField, current: unknown, input: unknown): boolean {
  if (field.kindDef.isEmpty(current) && field.kindDef.isEmpty(input)) return true
  return same(current, input)
}

function same(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
  return a.every((item, i) => Object.is(item, b[i]))
}

/**
 * The input a form starts with, with the values of each static fill whose trigger has a value, as
 * an open form settles them. Nothing is edited yet, so they set every field `given` has no key
 * for. Each pass, every field its conditions clear loses its value, as an open form clears it,
 * unless `given` has a key for it, and each fill whose trigger has another value than the one it
 * last handled runs again: with a value it sets its fields, and without one it blanks them. A
 * trigger that starts without a value blanks nothing. Every fill reads the input as the pass
 * began, so the order of the fields doesn't matter.
 */
function fillInitialInput<T>(
  plan: FillPlan,
  engine: Engine | undefined,
  input: T,
  given: unknown,
): T {
  const fills = plan.fills.filter(
    (fill) => fill.target.static && !isGiven(given, fill.trigger.path),
  )
  // The value of its trigger that each fill last handled.
  const handled = new Map<PlannedFill, FillTriggerValue | undefined>()
  let current: unknown = input
  // A value goes one fill down a chain of fills per pass, once as it is set and once as a clear
  // blanks it, so the input settles within this many passes.
  for (let pass = 0; pass < 2 * fills.length + 2; pass++) {
    const start = current
    if (engine) {
      const toClear = engine.evaluate(current).toClear.filter(({ path }) => !isGiven(given, path))
      current = clearFields(current, toClear)
    }
    const read = current
    for (const fill of fills) {
      const value = triggerValue(fill.trigger, read, NONE_CLEARED)
      if (same(value, handled.get(fill))) continue
      handled.set(fill, value)
      const values = value === undefined ? {} : staticValues(fill, value, read)
      for (const field of fill.fields) {
        if (!isGiven(given, field.path)) {
          current = setAt(current, field.path, fit(rawOf(values, field), field).input)
        }
      }
    }
    if (current === start) break
  }
  return current as T
}

/** The values a static fill gives at once for `value`. */
function staticValues(
  fill: PlannedFill,
  value: FillTriggerValue,
  input: unknown,
): Readonly<Record<string, unknown>> {
  const signal = createAbortController().signal
  const result = fill.target.values(value, { signal, input: inputOf(input) })
  if (isThenable(result)) {
    throw new TypeError(
      `The fill of "${fill.trigger.dotPath}" is static, so its values() can't give a promise`,
    )
  }
  const values = valuesOf(result)
  if (!values) throw notValues(fill, result)
  return values
}

/** A fill that waits for its values. */
interface Call {
  readonly controller: WebAbortController
  /**
   * Settles once the values came and were applied, or were dropped, or as soon as the call is
   * aborted, so nothing waits for a call that is no longer pending. Never rejects.
   */
  done: Promise<void>
}

/** A fill's values for one field, to set. */
interface Write {
  readonly field: FillField
  readonly input: unknown
}

/**
 * While a form loads, values are set as the ones it starts with. Once it is open, they are set as
 * changes.
 */
type Phase = 'load' | 'change'

function openFills(
  plan: FillPlan,
  engine: Engine | undefined,
  form: FillsForm,
  options: OpenFillsOptions,
): FillsRun {
  const { given } = options
  // The fills of each trigger, the triggers in the order their fills run.
  const byTrigger = new Map<FillField, PlannedFill[]>()
  for (const fill of plan.fills) {
    byTrigger.set(fill.trigger, [...(byTrigger.get(fill.trigger) ?? []), fill])
  }
  // The last value of each trigger that its fills handled.
  const seen = new Map<FillField, FillTriggerValue | undefined>()
  // What each field holds while the user hasn't changed it: what it started with, then what the
  // last fill set. A field that holds something else was edited.
  const baselines = new Map<FillField, unknown>()
  const calls = new Map<PlannedFill, Call>()
  // The fills to run as the form starts, with the value of their trigger.
  const loads = new Map<PlannedFill, FillTriggerValue>()
  const listeners = new Set<() => void>()
  let state = NOTHING_PENDING
  let pendingKey = ''
  // How deep the run is in its own work, and whether `update()` was called during it.
  let depth = 0
  let changed = false

  const opened = form.getInput()
  const clearedAtOpen = clearedIn(engine, opened)
  for (const [trigger, fills] of byTrigger) {
    const value = triggerValue(trigger, opened, clearedAtOpen)
    seen.set(trigger, value)
    if (value === undefined || isGiven(given, trigger.path)) continue
    for (const fill of fills) if (!fill.target.static) loads.set(fill, value)
  }
  for (const fill of plan.fills) {
    for (const field of fill.fields) baselines.set(field, valueAt(opened, field.path))
  }

  function report(error: unknown, info: FillErrorInfo): void {
    // Called on `options`, so an `onError` method keeps its `this`.
    if (options.onError) options.onError(error, info)
    else throwLater(error)
  }

  /** Runs `work`, then the updates asked for during it. */
  function guarded(work: () => void): void {
    depth++
    try {
      work()
    } finally {
      depth--
    }
    if (!depth && changed) update()
  }

  function update(): void {
    changed = true
    if (depth) return
    guarded(() => {
      while (changed) {
        changed = false
        // One change at a time: its fill can set other triggers, so the input is read again.
        const input = form.getInput()
        const isCleared = clearedIn(engine, input)
        for (const trigger of byTrigger.keys()) {
          const value = triggerValue(trigger, input, NONE_CLEARED)
          // A trigger its conditions clear changes once it is blank: blanking its fields could
          // end the clear, and it would fill them again.
          if (value !== undefined && isCleared(trigger)) continue
          if (same(value, seen.get(trigger))) continue
          change(trigger, value, 'change')
          changed = true
          break
        }
      }
    })
  }

  /** A trigger has a new value: its fills run, or blank their fields when it has none. */
  function change(trigger: FillField, value: FillTriggerValue | undefined, phase: Phase): void {
    seen.set(trigger, value)
    const fills = byTrigger.get(trigger) as PlannedFill[]
    for (const fill of fills) {
      loads.delete(fill)
      calls.get(fill)?.controller.abort()
      calls.delete(fill)
    }
    notify()
    if (value === undefined) clear(fills, phase)
    else for (const fill of fills) run(fill, value, phase)
  }

  /** Blanks every field the fills set, edited or not. */
  function clear(fills: readonly PlannedFill[], phase: Phase): void {
    const fields = new Set(fills.flatMap((fill) => fill.fields))
    const writes = [...fields]
      .filter((field) => phase === 'change' || !isGiven(given, field.path))
      .map((field) => ({ field, input: blankOf(field) }))
    write(writes, phase)
  }

  function run(fill: PlannedFill, value: FillTriggerValue, phase: Phase): void {
    const info: FillErrorInfo = { trigger: fill.trigger.dotPath, value }
    const controller = createAbortController()
    let result: FillResult | PromiseLike<FillResult>
    try {
      result = fill.target.values(value, {
        signal: controller.signal,
        input: inputOf(form.getInput()),
      })
    } catch (error) {
      loads.delete(fill)
      report(error, info)
      return
    }
    if (!isThenable(result)) {
      loads.delete(fill)
      apply(fill, value, result, phase)
      return
    }
    const call: Call = { controller, done: Promise.resolve() }
    // Only the newest call of a fill is applied: an aborted or older one is dropped unseen.
    const settle = (work: () => void) => {
      if (calls.get(fill) !== call) return
      calls.delete(fill)
      loads.delete(fill)
      notify()
      guarded(work)
    }
    const answered = Promise.resolve(result).then(
      (values) => settle(() => apply(fill, value, values, phase)),
      (error: unknown) => settle(() => report(error, info)),
    )
    const aborted = new Promise<void>((resolve) => {
      controller.signal.addEventListener('abort', () => resolve(), { once: true })
    })
    call.done = Promise.race([answered, aborted])
    calls.set(fill, call)
    notify()
  }

  /**
   * Sets each field of the fill that the user hasn't edited, or every one with `'always'`, to its
   * value fitted to it, or blank when the fill has none for it.
   */
  function apply(fill: PlannedFill, value: FillTriggerValue, result: unknown, phase: Phase): void {
    const info: FillErrorInfo = { trigger: fill.trigger.dotPath, value }
    const values = valuesOf(result)
    if (!values) {
      report(notValues(fill, result), info)
      return
    }
    const input = form.getInput()
    const writes: Write[] = []
    for (const field of fill.fields) {
      const fitted = fit(rawOf(values, field), field)
      if (fitted.error) report(fitted.error, { ...info, field: field.dotPath })
      if (phase === 'load' && isGiven(given, field.path)) continue
      if (!writable(field, valueAt(input, field.path), fill)) continue
      writes.push({ field, input: fitted.input })
    }
    write(withoutCleared(writes, input), phase)
  }

  function writable(field: FillField, current: unknown, fill: PlannedFill): boolean {
    if (fill.target.overwrite === 'always' || field.kindDef.isEmpty(current)) return true
    return same(current, baselines.get(field))
  }

  /**
   * The writes without those to fields the conditions clear once they are all set: they would be
   * blank at once, and a value they start with would leave them changed.
   */
  function withoutCleared(writes: readonly Write[], input: unknown): readonly Write[] {
    if (!engine || !writes.length) return writes
    const next = writes.reduce((at, { field, input }) => setAt(at, field.path, input), input)
    const isCleared = clearedIn(engine, next)
    return writes.filter(({ field }) => !isCleared(field))
  }

  /**
   * Sets each field that doesn't hold its input yet, then runs the fills of the triggers among
   * them, in the same phase.
   */
  function write(writes: readonly Write[], phase: Phase): void {
    const input = form.getInput()
    for (const { field, input: value } of writes) {
      baselines.set(field, value)
      if (holds(field, valueAt(input, field.path), value)) continue
      if (phase === 'load') form.setStartInput(field.path, value)
      else form.setInput(field.path, value)
    }
    const written = new Set(writes.map(({ field }) => field))
    for (const trigger of byTrigger.keys()) {
      if (!written.has(trigger)) continue
      const now = form.getInput()
      const value = triggerValue(trigger, now, clearedIn(engine, now))
      if (!same(value, seen.get(trigger))) change(trigger, value, phase)
    }
  }

  /** Makes a new state when the fills that wait change, and tells the listeners. */
  function notify(): void {
    const waiting = plan.fills.filter((fill) => calls.has(fill))
    const key = waiting.map((fill) => plan.fills.indexOf(fill)).join()
    if (key === pendingKey) return
    pendingKey = key
    const paths = new Set(
      waiting.flatMap((fill) => [fill.trigger, ...fill.fields]).map(({ path }) => pathKey(path)),
    )
    state = waiting.length
      ? {
          pending: plan.triggers
            .filter((trigger) => waiting.some((fill) => fill.trigger === trigger))
            .map((trigger) => trigger.dotPath),
          isPending: (path) => paths.has(pathKey(path)),
        }
      : NOTHING_PENDING
    for (const listener of listeners) listener()
  }

  return {
    get state() {
      return state
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    start() {
      guarded(() => {
        // A fill whose trigger an earlier one sets runs with its new value, and leaves `loads`.
        for (const [fill, value] of loads) {
          if (calls.has(fill)) continue
          const input = form.getInput()
          if (same(triggerValue(fill.trigger, input, clearedIn(engine, input)), value)) {
            run(fill, value, 'load')
          } else {
            // The trigger changed before the form started: `update()` runs that change.
            loads.delete(fill)
          }
        }
      })
    },
    update,
    async settled() {
      while (calls.size) await Promise.all([...calls.values()].map((call) => call.done))
    },
    stop() {
      for (const call of calls.values()) call.controller.abort()
      calls.clear()
      notify()
    },
  }
}

const pathKey = (path: FieldPath) => JSON.stringify(path)
