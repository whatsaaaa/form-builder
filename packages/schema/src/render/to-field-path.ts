/** A field's Formisch path, with real indexes: `['lines', 0, 'quantity']`. */
export type FieldPath = readonly (string | number)[]

/**
 * A field's Formisch path: its `dataPath` with each `'*'` replaced by the index of the array item
 * it is in, outermost first. `toFieldPath(['lines', '*', 'qty'], [2])` is `['lines', 2, 'qty']`.
 * A path with more `'*'` than indexes is a mistake in the code, so it throws a `TypeError`.
 */
export function toFieldPath(
  dataPath: readonly (string | number)[],
  indexes: readonly number[],
): FieldPath {
  let next = 0
  return dataPath.map((key) => {
    if (key !== '*') return key
    const index = indexes[next++]
    if (index === undefined) {
      throw new TypeError(
        `"${dataPath.join('.')}" needs the index of each array item it is in, one per '*'. Got [${indexes.join(', ')}].`,
      )
    }
    return index
  })
}
