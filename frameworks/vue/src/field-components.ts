import type { FieldElementProps } from '@formisch/vue'
import type {
  FieldPath,
  JsonField,
  JsonLayoutRow,
  JsonLayoutSection,
  ValueKind,
} from '@whatsaaaa/form-builder-schema'
import type { Component, VNode } from 'vue'

/** Your component for each field type, by type name: `{ text: TextInput, group: Fieldset }`. */
export type FieldComponents = Record<string, Component>

/** The props of a component for a display element, like a heading. */
export interface DisplayFieldProps {
  field: JsonField
}

/** The props of a component for a field with a value. */
export interface ValueFieldProps {
  field: JsonField
  path: FieldPath
  /** The kind of the value, e.g. `'number'`. */
  kind: ValueKind
  /** True when the definition makes the field required. */
  required: boolean
  /** The field's current input. */
  input: unknown
  /** The field's error messages, or null when it has none. */
  errors: [string, ...string[]] | null
  /** Bind these to the input element: its name, ref, and focus, change and blur handlers. */
  inputProps: FieldElementProps
  /** Sets the input, after turning `'5'` into `5` for a number, or a `FileList` into files. */
  setInput: (input: unknown) => void
}

/** The props of a component for a container of kind `object`, like the built-in group. */
export interface GroupFieldProps {
  field: JsonField
  path: FieldPath
}

/** The slots of a group component: its default slot renders the group's fields. */
export interface GroupFieldSlots {
  default(): VNode[]
}

/** The props of a component for a container of kind `array`, like the built-in array. */
export interface ArrayFieldProps {
  field: JsonField
  path: FieldPath
  /** One id per item, to use as its `key`. */
  items: string[]
  /** The array's own error messages, e.g. from `maxLength`, or null. */
  errors: [string, ...string[]] | null
  /** Adds an item at the end. */
  add: () => void
  remove: (index: number) => void
  move: (from: number, to: number) => void
}

/** The slots of an array component: its default slot renders the fields of the item at `index`. */
export interface ArrayFieldSlots {
  default(props: { index: number }): VNode[]
}

/**
 * Your component for each layout type a definition's `layout` uses: `{ section: Card, row: Grid }`.
 * A definition without sections or rows needs none.
 */
export interface LayoutComponents {
  section?: Component
  row?: Component
}

/** The props of a component for a section of the layout. */
export interface SectionProps {
  /** The section as written, with its `id`, `label`, `description` and `ui`. */
  section: JsonLayoutSection
}

/** The slots of a section component: its default slot renders the section's items. */
export interface SectionSlots {
  default(): VNode[]
}

/** The props of a component for a row of the layout: one line of a 12-column grid. */
export interface RowProps {
  /** The row as written, with its `id` and `ui`. */
  row: JsonLayoutRow
  /** How many of the 12 columns each cell takes, in order. They add up to 12 at most. */
  spans: number[]
}

/** The slots of a row component: its default slot renders the cell at `index`. */
export interface RowSlots {
  default(props: { index: number }): VNode[]
}
