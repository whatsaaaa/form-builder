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
  fieldPathsOf,
  type FormLayout,
  issuesOfStep,
  type LayoutStep,
  type StepIssue,
} from '@whatsaaaa/form-builder-schema'
import { useEffect, useMemo, useRef, useState } from 'react'

/** The steps of a form, from its layout. A form without `steps` in its layout has one. */
export interface JsonFormSteps {
  /** Every step, in order. */
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
 * when the user left it, and none the first time they get to it, a step that failed Next revalidates as the user fixes it, a submit
 * before the last step moves on like Next, and a submit that fails because of an earlier step
 * goes back to it. Like Formisch's `useForm`, it reads the validation modes on the first render.
 */
export function useJsonFormSteps(form: FormStore, layout: FormLayout, modes: Modes): JsonFormSteps {
  const list = layout.steps
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

    async function goTo(target: number): Promise<boolean> {
      if (!Number.isInteger(target) || target < 0 || target >= list.length) {
        throw new RangeError(`No step ${target}. The form has ${list.length}.`)
      }
      if (target <= at.index) {
        move(target)
        return true
      }
      const { issues } = await validate(form)
      for (let step = at.index; step < target; step++) {
        const found = issuesOfStep(list[step] as LayoutStep, issues)
        if (found.length) {
          stop(step, found)
          return false
        }
        at.failed.delete(step)
      }
      move(target)
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
      for (const path of fieldPathsOf(list[target] as LayoutStep, getInput(form))) {
        setErrors(form, { path, errors: errors?.get(JSON.stringify(path)) ?? null } as never)
      }
      at.index = target
      setIndex(target)
    }

    /** Keeps the errors of the current step, for when the user comes back to it. */
    function leave() {
      const paths = fieldPathsOf(list[at.index] as LayoutStep, getInput(form))
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
      const step = list.findIndex((each) => issuesOfStep(each, issues).length)
      if (step !== -1 && step < at.index) stop(step, issuesOfStep(list[step] as LayoutStep, issues))
    }

    const next = () => (at.index === list.length - 1 ? Promise.resolve(false) : goTo(at.index + 1))
    const back = () => {
      if (at.index > 0) move(at.index - 1)
    }
    return { goTo, next, back, events, afterSubmit }
  }, [form, list])

  // The field a step was stopped on, once the step has rendered.
  useEffect(() => {
    const path = state.current.focus
    state.current.focus = undefined
    if (path) focus(form, { path: path as never })
  }, [form, index])

  const stepped = list.length > 1
  useEffect(() => {
    if (!stepped) return
    fieldEvents.set(form, methods.events)
    // Before the last step, a submit, like Enter in a step with a single text input, is a Next.
    // It is caught on its way down to the form, before Formisch's own handler sees it.
    const onSubmit = (event: Event) => {
      if (event.target !== formElementOf(form)) return
      if (state.current.index === list.length - 1) {
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
  }, [form, list, methods, stepped])

  // A submit that fails because of a step before the last, e.g. on a form rule, goes back to it.
  // React can batch the start and the end of a submit into one render, so the submit is marked
  // as it starts, and each render checks whether Formisch has finished it.
  const submitting = form.isSubmitting
  useEffect(() => {
    if (!state.current.submitting || submitting) return
    state.current.submitting = false
    if (!form.isValid) void methods.afterSubmit()
  })

  return useMemo(
    () => ({
      list,
      index,
      current: list[index] as LayoutStep,
      isFirst: index === 0,
      isLast: index === list.length - 1,
      next: methods.next,
      back: methods.back,
      goTo: methods.goTo,
    }),
    [list, index, methods],
  )
}

/** The `<form>` Formisch's `<Form>` renders, which it keeps on the store for its `submit()`. */
function formElementOf(form: FormStore): HTMLFormElement | undefined {
  return (form as unknown as { '~internal'?: { element?: HTMLFormElement } })['~internal']?.element
}
