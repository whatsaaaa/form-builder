import type * as v from 'valibot'
import type { FieldNode } from './field-tree'
import type { LayoutStep } from './form-layout'
import type { FieldPath } from './to-field-path'

/** An issue on a field of a step, as `issuesOfStep` gives it. */
export interface StepIssue {
  readonly issue: v.BaseIssue<unknown>
  /** The field the issue is on. */
  readonly field: FieldNode
  /** The field's Formisch path, with the indexes from the issue: `['lines', 0, 'product']`. */
  readonly path: FieldPath
}

/**
 * The issues of a Valibot result that are on the fields placed in the step, in layout order, e.g.
 * from Formisch's `validate(form)`. A form is checked as a whole, so its issues are on the fields of
 * every step: these are the ones that keep the user on this one.
 */
export function issuesOfStep(
  step: LayoutStep,
  issues: readonly v.BaseIssue<unknown>[] | undefined,
): StepIssue[] {
  const order = new Map(step.fields.map((field, i) => [field.dataPath.join('.'), { field, i }]))
  const found = (issues ?? []).flatMap((issue) => {
    const path = pathOf(issue)
    const at = order.get(path.map((key) => (typeof key === 'number' ? '*' : key)).join('.'))
    return at ? [{ issue, field: at.field, path, i: at.i }] : []
  })
  return found.sort((a, b) => a.i - b.i).map(({ issue, field, path }) => ({ issue, field, path }))
}

/**
 * The path of the field an issue is on, as Formisch reads it: its keys, up to the first that is no
 * string or number, or that is in a map or a set.
 */
function pathOf(issue: v.BaseIssue<unknown>): (string | number)[] {
  const path: (string | number)[] = []
  for (const item of issue.path ?? []) {
    const key: unknown = item.key
    const keyed = typeof key === 'string' || typeof key === 'number'
    if (!keyed || item.type === 'map' || item.type === 'set') break
    path.push(key)
  }
  return path
}
