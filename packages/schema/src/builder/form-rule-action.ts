import * as v from 'valibot'
import { evaluationOf } from '../visibility/gate'
import type { CheckedFormRule } from './check-form-rules'

type Path = readonly (string | number)[]

/** The check of a definition's form rules, on the value of the whole form. */
export type FormRuleAction = v.RawCheckAction<Record<string, unknown>>

/** A form rule, with its message resolved. */
export interface FormRuleWithMessage {
  rule: CheckedFormRule
  message: string
}

/**
 * Runs each form rule on the form's value and puts its issue on its `field`. A rule on the fields
 * of a list's items runs once per item, with the item's index in place of each `'*'`.
 *
 * A rule only runs when none of the fields it reads has an issue, or is hidden by conditions.
 * `v.partialCheck` can't do this: it runs whenever the form has no schema issues, even when a
 * field it reads failed a rule. The rules run in one check, and each sees only the issues of the
 * fields, never those of the other form rules, so their order never changes what they report.
 */
export function formRulesAction(rules: readonly FormRuleWithMessage[]): FormRuleAction {
  return v.rawCheck(({ dataset, config, addIssue }) => {
    const fieldIssues = dataset.issues?.slice()
    const hidden = evaluationOf(config)
    for (const { rule, message } of rules) {
      const { def, params, paths } = rule
      for (const indexes of itemIndexes(dataset.value, paths[0] as string[])) {
        const read = paths.map((keys) => withIndexes(keys, indexes))
        if (read.some((path) => hasIssue(fieldIssues, path))) continue
        if (hidden && read.some((path) => hidden.isHiddenAt(path))) continue

        const values = read.map((path) => valueAt(dataset.value, path))
        // Like a field's rules, a form rule never runs on an empty value.
        if (values.includes(undefined) || def.check(values, params)) continue

        const field = read[0] as Path
        addIssue({ message, input: values[0], path: issuePath(dataset.value, field) })
      }
    }
  })
}

/** Replaces each `'*'` in `keys` with the next index. */
const withIndexes = (keys: readonly string[], indexes: readonly number[]): Path => {
  let next = 0
  return keys.map((key) => (key === '*' ? (indexes[next++] as number) : key))
}

const valueAt = (input: unknown, path: Path): unknown =>
  path.reduce<unknown>(
    (value, key) =>
      typeof value === 'object' && value !== null
        ? (value as Record<string | number, unknown>)[key]
        : undefined,
    input,
  )

/** True when an issue is on `path`, inside it, or on a value that holds it. */
const hasIssue = (issues: readonly v.BaseIssue<unknown>[] | undefined, path: Path) =>
  !!issues?.some((issue) =>
    (issue.path ?? []).every((item, i) => i >= path.length || item.key === path[i]),
  )

/** Valibot's path to `path` in `input`, the way an object or array schema reports it. */
const issuePath = (input: unknown, path: Path) =>
  path.map((key, i) => {
    const parent = valueAt(input, path.slice(0, i))
    return {
      type: Array.isArray(parent) ? 'array' : 'object',
      origin: 'value',
      input: parent,
      key,
      value: valueAt(parent, [key]),
    }
  }) as unknown as [v.IssuePathItem, ...v.IssuePathItem[]]

/** The indexes for each `'*'` in `keys`, for every item `value` has there. */
function* itemIndexes(
  value: unknown,
  keys: readonly string[],
  indexes: readonly number[] = [],
): Generator<readonly number[], void, undefined> {
  const star = keys.indexOf('*')
  if (star === -1) {
    yield indexes
    return
  }
  const list = valueAt(value, keys.slice(0, star))
  if (!Array.isArray(list)) return
  for (const [i, item] of list.entries()) {
    yield* itemIndexes(item, keys.slice(star + 1), [...indexes, i])
  }
}
