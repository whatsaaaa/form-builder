import type { DefinitionPath } from '../errors/definition-error'
import type { ValueKind } from '../shared/value-kind'
import type { JsonField } from './json-form'

/** One field found by the builder's `walkFields`. */
export interface WalkedField {
  field: JsonField
  /** The field's type, e.g. `'text'`. */
  type: string
  /**
   * Where the field's value is, as a Formisch path: `['address', 'city']`. The items of an array
   * have no fixed index, so they have `'*'` in its place. A field without a name, and a display
   * element like a heading even with one, has its parent's path.
   */
  dataPath: readonly (string | number)[]
  /** Where the field is in the definition: `['fields', 1, 'fields', 0]`. */
  definitionPath: DefinitionPath
  /** 0 for the form's own fields, 1 for the fields inside them, and so on. */
  depth: number
  /**
   * The kind of the field's value, e.g. `'string'`, or `'none'` for a display element. Left out for
   * a field with issues.
   */
  kind?: ValueKind
  /** The kind of the items, for a field of kind `array` whose type has one, e.g. `'file'`. */
  itemKind?: ValueKind
}
