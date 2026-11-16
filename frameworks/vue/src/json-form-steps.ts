import {
  focus,
  type FormStore,
  getErrors,
  getInput,
  setErrors,
  validate,
  type ValidationMode,
} from '@formisch/vue'
import {
  type FieldPath,
  fieldPathsOfStep,
  type FormLayout,
  issuesOfStep,
  type LayoutStep,
  type StepIssue,
  type VisibilityState,
} from '@whatsaaaa/form-builder-schema'
import { computed, getCurrentScope, nextTick, onScopeDispose, ref, watch } from 'vue'
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
   * Waits for the fills that are pending, then validates the whole form, and moves to the next
   * step, the one after this among the steps on show once the fills set their values, when the
   * fields of this one have no issues. Otherwise it stays, and focuses the first field with an
   * issue, in layout order. Resolves to whether it moved: a step the user goes to, or a reset,
   * while it waits wins, and it resolves to false.
   */
  next(): Promise<boolean>
  /** Moves to the step before, without validating. */
  back(): void
  /**
   * Moves to the step at `index`. Back is free, and forward waits for pending fills and validates
   * every step on the way once they set their values, like `next()`, and stops at the first with
   * issues. Resolves to whether it got there: not to a step the fills hid meanwhile.
   */
  goTo(index: number): Promise<boolean>
}

/** A field's error messages in Formisch, or null. */
type Errors = [string, ...string[]] | null

/** A field of a step with its Formisch path, like an issue of `issuesOfStep` has them. */
type StepField = Pick<StepIssue, 'field' | 'path'>

/** What a field tells the steps it was through, by Formisch's name for the validation mode. */
export type FieldEvent = Exclude<ValidationMode, 'initial' | 'submit'>

/** Revalidates a step that failed Next on each field event, like a form after a failed submit. */
type FieldEvents = (event: FieldEvent) => void

const fieldEvents = new WeakMap<FormStore, FieldEvents>()

/** What a field of `form` calls on each event, for a form with steps. Undefined with one step. */
export const fieldEventsOf = (form: FormStore): FieldEvents | undefined => fieldEvents.get(form)

/**
 * The steps of `layout`, for `useJsonForm`. With more than one, a step shows the errors it had
 * when the user left it, and none the first time they get to it, a step that failed Next
 * revalidates as the user fixes it, a submit before the last step moves on like Next, and a submit
 * that fails because of an earlier step goes back to it. The steps `visibility` hides are skipped,
 * and moving forward waits until `fills` are settled, so it validates the values they set.
 * `restart()` goes back to the first step as the form opened, for a reset.
 */
export function useJsonFormSteps(
  form: FormStore,
  layout: FormLayout,
  modes: {
    validate?: ValidationMode | undefined
    revalidate?: Exclude<ValidationMode, 'initial'> | undefined
  },
  visibility: { readonly value: VisibilityState },
  fills: { settled(): Promise<void> },
): { steps: JsonFormSteps; restart(): void } {
  const all = layout.steps
  // The current step, by its index in `all`, as are the steps of the maps and sets below.
  const at = ref(0)
  const current = computed(() => all[at.value] as LayoutStep)
  // The current step stays on show, so it never goes from under the user.
  const list = computed(() =>
    all.filter((step, i) => i === at.value || !visibility.value.isStepHidden(step)),
  )
  const index = computed(() => list.value.indexOf(current.value))
  // The errors each step had when the user left it, by the JSON of each field's path.
  const left = new Map<number, Map<string, Errors>>()
  // The steps that failed Next, and haven't passed since.
  const failed = new Set<number>()
  // How many times the current step was set, so that a Next that waited knows of a move meanwhile.
  let moves = 0

  async function goTo(target: number): Promise<boolean> {
    const shown = list.value
    if (!Number.isInteger(target) || target < 0 || target >= shown.length) {
      throw new RangeError(`No step ${target}. The form has ${shown.length}.`)
    }
    const step = shown[target] as LayoutStep
    if (target <= index.value) {
      move(all.indexOf(step))
      return true
    }
    return forward(() => list.value.indexOf(step))
  }

  /**
   * Moves forward to the step at `target()` in `list`, read once the fills set their values, and
   * validates every step on the way, stopping at the first with issues.
   */
  async function forward(target: () => number): Promise<boolean> {
    const before = moves
    // Next goes on once the task that called it is over. A click runs its default action after its
    // handlers, and Vue can render in between: a Next button that turns into the submit button on
    // the last step would then submit the form as the user gets there.
    await afterTask()
    // The values a fill is waiting for are validated, not the blanks they replace, and the steps
    // they show or hide are the ones on the way.
    await fills.settled()
    const shown = list.value
    const from = index.value
    const end = target()
    // A step the user went to while it waited wins, as does a reset, and a step the fills hid
    // isn't reached.
    if (moves !== before || end <= from || end >= shown.length) return false
    const { issues } = await validate(form)
    if (moves !== before) return false
    for (const step of shown.slice(from, end)) {
      const found = issuesOfStep(step, issues)
      if (found.length) {
        await stop(all.indexOf(step), found)
        return false
      }
      failed.delete(all.indexOf(step))
    }
    move(all.indexOf(shown[end] as LayoutStep))
    return true
  }

  /**
   * Moves to a step as the user left it: with the errors it had then, and none the first time, and
   * revalidating if it failed Next. Validating the steps before set errors on its fields, which
   * the user never saw.
   */
  function move(target: number) {
    leave()
    const errors = left.get(target)
    for (const path of fieldPathsOfStep(all[target] as LayoutStep, getInput(form))) {
      setErrors(form, { path, errors: errors?.get(JSON.stringify(path)) ?? null } as never)
    }
    at.value = target
    moves++
  }

  /** Goes back to the first step, with no step left or failed yet, as the form opened. */
  function restart() {
    left.clear()
    failed.clear()
    at.value = 0
    moves++
  }

  /** Keeps the errors of the current step, for when the user comes back to it. */
  function leave() {
    const paths = fieldPathsOfStep(current.value, getInput(form))
    const errors = paths.map((path): [string, Errors] => [JSON.stringify(path), errorsAt(path)])
    left.set(at.value, new Map(errors))
  }

  const errorsAt = (path: FieldPath): Errors => getErrors(form, { path } as never)

  /**
   * The fields of a step with errors in the form now, in layout order, with those of each array
   * item. Unlike a new validation, it leaves the errors the form has.
   */
  function errorsOfStep(step: LayoutStep): StepField[] {
    const input = getInput(form)
    // The paths of one field at a time, so that each comes with its field.
    return step.fields.flatMap((field) =>
      fieldPathsOfStep({ ...step, fields: [field] }, input)
        .filter(errorsAt)
        .map((path) => ({ field, path })),
    )
  }

  /** Stays on, or goes to, the step at `target`, with its issues shown. */
  async function stop(target: number, found: readonly StepField[]) {
    failed.add(target)
    if (target !== at.value) leave()
    at.value = target
    moves++
    await nextTick()
    // A group or an array has no element: the first field that has one gets the focus.
    const first = found.find((issue) => issue.field.role === 'value')
    if (first) focus(form, { path: first.path as never })
  }

  const steps: JsonFormSteps = {
    get list() {
      return list.value
    },
    get index() {
      return index.value
    },
    get current() {
      return current.value
    },
    get isFirst() {
      return index.value === 0
    },
    get isLast() {
      return index.value === list.value.length - 1
    },
    next: () => (steps.isLast ? Promise.resolve(false) : forward(() => index.value + 1)),
    back: () => {
      if (index.value > 0) move(all.indexOf(list.value[index.value - 1] as LayoutStep))
    },
    goTo,
  }
  if (all.length > 1) watchSteps()
  return { steps, restart }

  function watchSteps() {
    fieldEvents.set(form, (event) => {
      // In the other modes, Formisch revalidates a field with errors itself.
      const validateMode = modes.validate ?? 'submit'
      if (!failed.has(at.value) || validateMode !== 'submit' || form.isSubmitted) return
      if (event === (modes.revalidate ?? 'input')) void validate(form)
    })

    // A submit that fails because of a step before the last, e.g. on a form rule, goes back to it.
    // The submit left its errors on the fields, the schema's or those its handler set, like a
    // server's: validating again to find the step would clear the handler's.
    watch(
      () => form.isSubmitting,
      async (submitting, was) => {
        if (submitting || !was || form.isValid) return
        for (const step of list.value.slice(0, index.value)) {
          const found = errorsOfStep(step)
          if (found.length) return stop(all.indexOf(step), found)
        }
      },
    )

    // Before the last step, a submit, like Enter in a step with a single text input, is a Next.
    // It is caught on its way down to the form, before Formisch's own handler sees it.
    if (typeof document === 'undefined') return
    const onSubmit = (event: Event) => {
      if (event.target !== formElementOf(form) || steps.isLast) return
      event.preventDefault()
      event.stopImmediatePropagation()
      void steps.next()
    }
    document.addEventListener('submit', onSubmit, { capture: true })
    if (getCurrentScope()) {
      onScopeDispose(() => document.removeEventListener('submit', onSubmit, { capture: true }))
    }
  }
}

/** Resolves once the task that called it is over, and the browser is done with its event. */
const afterTask = () => new Promise<void>((resolve) => setTimeout(resolve))
