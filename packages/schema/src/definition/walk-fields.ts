import type { DefinitionPath } from '../errors/definition-error'
import type { ValueKind } from '../shared/value-kind'
import type { JsonField, JsonForm } from './json-form-schema'

/** One field found by `walkFields`. */
export interface WalkedField {
  field: JsonField
  /** The field's type, e.g. `'text'`. */
  type: string
  /**
   * Where the field's value is, as a Formisch path: `['address', 'city']`. The items of an array
   * have no fixed index, so they have `'*'` in its place. A field without a name, like a
   * heading, has its parent's path.
   */
  dataPath: readonly (string | number)[]
  /** Where the field is in the definition: `['fields', 1, 'fields', 0]`. */
  definitionPath: DefinitionPath
  /** 0 for the form's own fields, 1 for the fields inside them, and so on. */
  depth: number
  /**
   * The kind of the field's value, e.g. `'string'`, or `'none'` for a display element. Only the
   * builder's `walkFields` knows it, so the `walkFields` function leaves it out, and so does the
   * builder for a field with issues.
   */
  kind?: ValueKind
  /** The kind of the items, for a field of kind `array` whose type has one, e.g. `'file'`. */
  itemKind?: ValueKind
}

/**
 * Every field of a definition, at every depth, in document order. A group or an array comes
 * before its fields, and the fields of an array's items come once. It reads the built-in
 * `group` and `array` types and needs no builder, so it doesn't check the definition: run
 * `validate()` first. For your own container types, use the builder's `walkFields`.
 */
export function* walkFields(definition: JsonForm): Generator<WalkedField, void, undefined> {
  yield* walkList(definition.fields, ['fields'], [], 0)
}

function* walkList(
  fields: readonly JsonField[],
  at: DefinitionPath,
  dataPath: readonly (string | number)[],
  depth: number,
): Generator<WalkedField, void, undefined> {
  for (const [i, field] of fields.entries()) {
    const path = field.name === undefined ? dataPath : [...dataPath, field.name]
    yield* walkField(field, [...at, i], path, depth)
  }
}

function* walkField(
  field: JsonField,
  definitionPath: DefinitionPath,
  dataPath: readonly (string | number)[],
  depth: number,
): Generator<WalkedField, void, undefined> {
  yield { field, type: field.type, dataPath, definitionPath, depth }

  if (field.type === 'group' && Array.isArray(field['fields'])) {
    yield* walkList(field['fields'], [...definitionPath, 'fields'], dataPath, depth + 1)
  } else if (field.type === 'array') {
    const items = [...dataPath, '*']
    if (isField(field['of'])) {
      // The field of a list of single values has no name: its value is the item itself.
      yield* walkField(field['of'], [...definitionPath, 'of'], items, depth + 1)
    } else if (Array.isArray(field['fields'])) {
      yield* walkList(field['fields'], [...definitionPath, 'fields'], items, depth + 1)
    }
  }
}

const isField = (value: unknown): value is JsonField =>
  typeof value === 'object' && value !== null && 'type' in value
