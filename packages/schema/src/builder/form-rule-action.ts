import * as v from 'valibot'
import type { AnyAction } from '../shared/valibot-types'
import type { CheckedFormRule } from './check-form-rules'

type Path = readonly (string | number)[]

/**
 * Runs a form rule on the form's value and puts its issue on `field`. A rule on the fields of a
 * list's items runs once per item, with the item's index in place of each `'*'`.
 *
 * The rule only runs when none of the fields it reads has an issue. `v.partialCheck` can't do
 * this: it runs whenever the form has no schema issues, even when a field it reads failed a rule.
 */
export function formRuleAction(rule: CheckedFormRule, message: string): AnyAction {
  const { def, params, paths } = rule
  const fieldKeys = paths[0] as string[]

  return v.rawCheck(({ dataset, addIssue }) => {
    for (const indexes of itemIndexes(dataset.value, fieldKeys)) {
      const read = paths.map((keys) => withIndexes(keys, indexes))
      if (read.some((path) => hasIssue(dataset.issues, path))) continue

      const values = read.map((path) => valueAt(dataset.value, path))
      // Like a field's rules, a form rule never runs on an empty value.
      if (values.includes(undefined) || def.check(values, params)) continue

      const field = read[0] as Path
      addIssue({ message, input: values[0], path: issuePath(dataset.value, field) })
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
