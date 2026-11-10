import {
  focus,
  type FormStore,
  getErrors,
  getInput,
  setErrors,
  validate,
  type ValidationMode,
} from '@formisch/react'
import {
  type FieldPath,
  fieldPathsOfStep,
  type FormLayout,
  issuesOfStep,
  type LayoutStep,
  type StepIssue,
  type VisibilityState,
} from '@whatsaaaa/form-builder-schema'
import { useEffect, useMemo, useRef, useState } from 'react'
import { formElementOf } from './formisch-internals'

/** The steps of a form, from its layout. A form without `steps` in its layout has one. */
export interface JsonFormSteps {
  /**
   * The steps on show, in order. A step whose fields are all hidden by conditions, or that is
   * hidden itself, is left out, unless it is the current one: Next and Back skip it.
   */
  readonly list: readonly LayoutStep[]
  /** The index of the current step in `list`. */
  readonly index: number
  /** The step `<JsonFields>` renders. */
  readonly current: LayoutStep
  readonly isFirst: boolean
  readonly isLast: boolean
  /**
   * Validates the whole form, and moves to the next step when the fields of this one have no
   * issues. Otherwise it stays, and focuses the first field with an issue, in layout order.
   * Resolves to whether it moved.
   */
  next(): Promise<boolean>
  /** Moves to the step before, without validating. */
  back(): void
  /**
   * Moves to the step at `index`. Back is free, and forward validates every step on the way, like
   * `next()`, and stops at the first with issues. Resolves to whether it got there.
   */
  goTo(index: number): Promise<boolean>
}

/** A field's error messages in Formisch, or null. */
type Errors = [string, ...string[]] | null

/** What a field tells the steps it was through, by Formisch's name for the validation mode. */
export type FieldEvent = Exclude<ValidationMode, 'initial' | 'submit'>

/** Revalidates a step that failed Next on each field event, like a form after a failed submit. */
type FieldEvents = (event: FieldEvent) => void

const fieldEvents = new WeakMap<FormStore, FieldEvents>()

/** What a field of `form` calls on each event, for a form with steps. Undefined with one step. */
export const fieldEventsOf = (form: FormStore): FieldEvents | undefined => fieldEvents.get(form)

interface Modes {
  validate?: ValidationMode | undefined
  revalidate?: Exclude<ValidationMode, 'initial'> | undefined
}

/**
 * The steps of `layout`, for `useJsonForm`. With more than one, a step shows the errors it had
 * when the user left it, and none the first time they get to it, a step that failed Next
 * revalidates as the user fixes it, a submit before the last step moves on like Next, and a submit
 * that fails because of an earlier step goes back to it. The steps `visibility` hides are skipped.
 * Like Formisch's `useForm`, it reads the validation modes on the first render.
 */
export function useJsonFormSteps(
  form: FormStore,
  layout: FormLayout,
  modes: Modes,
  visibility: VisibilityState,
): JsonFormSteps {
  const all = layout.steps
  // The current step, by its index in `all`, as are the steps in `state` below.
  const [index, setIndex] = useState(0)
  // What the async methods and the event handlers read: always the latest.
  const state = useRef({
    index: 0,
    // The errors each step had when the user left it, by the JSON of each field's path.
    left: new Map<number, Map<string, Errors>>(),
    // The steps that failed Next, and haven't passed since.
    failed: new Set<number>(),
    // The field to focus once the step it is on has rendered.
    focus: undefined as FieldPath | undefined,
    // Whether a submit on the last step is on its way through Formisch.
    submitting: false,
    modes,
  })

  const methods = useMemo(() => {
    const at = state.current
    // The current step stays on show, so it never goes from under the user.
    const shown = () => all.filter((step, i) => i === at.index || !visibility.isStepHidden(step))
    const position = (list: readonly LayoutStep[]) => list.indexOf(all[at.index] as LayoutStep)

    async function goTo(target: number): Promise<boolean> {
      const list = shown()
      if (!Number.isInteger(target) || target < 0 || target >= list.length) {
        throw new RangeError(`No step ${target}. The form has ${list.length}.`)
      }
      const to = all.indexOf(list[target] as LayoutStep)
      if (target <= position(list)) {
        move(to)
        return true
      }
      // Next goes on once the task that called it is over. A click runs its default action after its
      // handlers, and React can render in between: a Next button that turns into the submit button on
      // the last step would then submit the form as the user gets there.
      await afterTask()
      const { issues } = await validate(form)
      for (const step of list.slice(position(list), target)) {
        const found = issuesOfStep(step, issues)
        if (found.length) {
          stop(all.indexOf(step), found)
          return false
        }
        at.failed.delete(all.indexOf(step))
      }
      move(to)
      return true
    }

    /**
     * Moves to a step as the user left it: with the errors it had then, and none the first time, and
     * revalidating if it failed Next. Validating the steps before set errors on its fields, which
     * the user never saw.
     */
    function move(target: number) {
      leave()
      const errors = at.left.get(target)
      for (const path of fieldPathsOfStep(all[target] as LayoutStep, getInput(form))) {
        setErrors(form, { path, errors: errors?.get(JSON.stringify(path)) ?? null } as never)
      }
      at.index = target
      setIndex(target)
    }

    /** Keeps the errors of the current step, for when the user comes back to it. */
    function leave() {
      const paths = fieldPathsOfStep(all[at.index] as LayoutStep, getInput(form))
      const errors = paths.map((path): [string, Errors] => [
        JSON.stringify(path),
        getErrors(form, { path } as never),
      ])
      at.left.set(at.index, new Map(errors))
    }

    /** Stays on, or goes to, the step at `target`, with its issues shown. */
    function stop(target: number, found: readonly StepIssue[]) {
      at.failed.add(target)
      // A group or an array has no element: the first field that has one gets the focus.
      const path = found.find((issue) => issue.field.role === 'value')?.path
      if (target === at.index) {
        if (path) focus(form, { path: path as never })
        return
      }
      leave()
      at.focus = path
      at.index = target
      setIndex(target)
    }

    const events: FieldEvents = (event) => {
      // In the other modes, Formisch revalidates a field with errors itself.
      const validateMode = at.modes.validate ?? 'submit'
      if (!at.failed.has(at.index) || validateMode !== 'submit' || form.isSubmitted) return
      if (event === (at.modes.revalidate ?? 'input')) void validate(form)
    }

    /** After a failed submit: back to the first step before this one with issues, if any. */
    async function afterSubmit() {
      const { issues } = await validate(form)
      const list = shown()
      const step = list.find((each) => issuesOfStep(each, issues).length)
      if (step && list.indexOf(step) < position(list)) {
        stop(all.indexOf(step), issuesOfStep(step, issues))
      }
    }

    const isLast = () => {
      const list = shown()
      return position(list) === list.length - 1
    }
    const next = () => (isLast() ? Promise.resolve(false) : goTo(position(shown()) + 1))
    const back = () => {
      const list = shown()
      const before = list[position(list) - 1]
      if (before) move(all.indexOf(before))
    }
    return { goTo, next, back, isLast, events, afterSubmit }
  }, [form, all, visibility])

  // The field a step was stopped on, once the step has rendered.
  useEffect(() => {
    const path = state.current.focus
    state.current.focus = undefined
    if (path) focus(form, { path: path as never })
  }, [form, index])

  const stepped = all.length > 1
  useEffect(() => {
    if (!stepped) return
    fieldEvents.set(form, methods.events)
    // Before the last step, a submit, like Enter in a step with a single text input, is a Next.
    // It is caught on its way down to the form, before Formisch's own handler sees it.
    const onSubmit = (event: Event) => {
      if (event.target !== formElementOf(form)) return
      if (methods.isLast()) {
        state.current.submitting = true
        return
      }
      event.preventDefault()
      event.stopImmediatePropagation()
      void methods.next()
    }
    document.addEventListener('submit', onSubmit, { capture: true })
    return () => {
      fieldEvents.delete(form)
      document.removeEventListener('submit', onSubmit, { capture: true })
    }
  }, [form, methods, stepped])

  // A submit that fails because of a step before the last, e.g. on a form rule, goes back to it.
  // React can batch the start and the end of a submit into one render, so the submit is marked
  // as it starts, and each render checks whether Formisch has finished it.
  const submitting = form.isSubmitting
  useEffect(() => {
    if (!state.current.submitting || submitting) return
    state.current.submitting = false
    if (!form.isValid) void methods.afterSubmit()
  })

  return useMemo(() => {
    const list = all.filter((step, i) => i === index || !visibility.isStepHidden(step))
    const current = all[index] as LayoutStep
    const at = list.indexOf(current)
    return {
      list,
      index: at,
      current,
      isFirst: at === 0,
      isLast: at === list.length - 1,
      next: methods.next,
      back: methods.back,
      goTo: methods.goTo,
    }
  }, [all, index, visibility, methods])
}

/** Resolves once the task that called it is over, and the browser is done with its event. */
const afterTask = () => new Promise<void>((resolve) => setTimeout(resolve))
