import type { LayoutStep } from './form-layout'
import type { FieldPath } from './to-field-path'

/**
 * The Formisch path of every field with a value placed in the step, for this input, with the
 * fields of each array item there is: `['lines', 0, 'product']`, `['lines', 1, 'product']`. In
 * layout order, a group or an array before its fields. For example, to clear a step's errors with
 * Formisch's `setErrors` when the user first gets to it.
 */
export function fieldPathsOfStep(step: LayoutStep, input: unknown): FieldPath[] {
  return step.fields.flatMap((field) => expand(field.dataPath, input))
}

/** `dataPath` with each `'*'` replaced by the index of each item the input has there. */
function expand(dataPath: readonly (string | number)[], input: unknown): FieldPath[] {
  const star = dataPath.indexOf('*')
  if (star === -1) return [dataPath]
  const list = dataPath.slice(0, star)
  const items = valueAt(input, list)
  if (!Array.isArray(items)) return []
  return items.flatMap((_, index) => expand([...list, index, ...dataPath.slice(star + 1)], input))
}

function valueAt(input: unknown, keys: readonly (string | number)[]): unknown {
  let value = input
  for (const key of keys) {
    value =
      typeof value === 'object' && value !== null
        ? (value as Record<string, unknown>)[key]
        : undefined
  }
  return value
}
