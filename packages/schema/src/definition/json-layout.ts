/**
 * Where the fields go. A layout never changes the value: `fields` alone decides its shape, its
 * validation and the output. It holds either `items`, for one page, or `steps`, for several.
 */
export type JsonLayout =
  | { items: readonly JsonLayoutItem[]; ui?: Record<string, unknown> }
  | { steps: readonly JsonLayoutStep[]; ui?: Record<string, unknown> }

/** One page of a layout with steps. */
export interface JsonLayoutStep {
  /** Unique across the layout, e.g. to jump to the step. */
  id?: string
  label?: string
  description?: string
  items: readonly JsonLayoutItem[]
  /** For renderers. This package never reads or checks it. */
  ui?: Record<string, unknown>
}

/**
 * One item of a layout: a field by its dot path, like `'email'` or `'address.city'`, `'*'` for
 * every field not placed elsewhere, a field with options, a section, a row, a slot, or a display
 * element written straight into the layout.
 */
export type JsonLayoutItem =
  | string
  | JsonLayoutField
  | JsonLayoutSection
  | JsonLayoutRow
  | JsonLayoutSlot
  | JsonLayoutDisplay

/** A field placed with options. */
export interface JsonLayoutField {
  /** Its dot path, from the fields around it: `'city'` inside `{ "field": "address" }`. */
  field: string
  /** How the fields of a group, or of each item of an array, are laid out. */
  items?: readonly JsonLayoutItem[]
  /** In a row: how many of its 12 columns the field takes. */
  span?: number
}

/** A block of items with a title, like a fieldset. It never nests the value. */
export interface JsonLayoutSection {
  type: 'section'
  /** Unique across the layout. */
  id?: string
  label?: string
  description?: string
  items: readonly JsonLayoutItem[]
  /** For renderers. This package never reads or checks it. */
  ui?: Record<string, unknown>
  /** In a row: how many of its 12 columns the section takes. */
  span?: number
}

/**
 * One line of a 12-column grid. Each item takes `span` columns, and the items without one share
 * the columns the others leave. The spans add up to 12 at most: a second line is a second row.
 */
export interface JsonLayoutRow {
  type: 'row'
  /** Unique across the layout. */
  id?: string
  items: readonly JsonLayoutItem[]
  /** For renderers. This package never reads or checks it. */
  ui?: Record<string, unknown>
  /** In a row: how many of its 12 columns this row takes. */
  span?: number
}

/** Where the app puts its own content, such as a submit button. */
export interface JsonLayoutSlot {
  type: 'slot'
  name: string
  /** In a row: how many of its 12 columns the slot takes. */
  span?: number
}

/**
 * A display element, like a heading, written as in `fields`, with an `id` instead of a `name`.
 * Validated by its type's props.
 */
export interface JsonLayoutDisplay {
  type: string
  /** Unique across the layout. */
  id?: string
  label?: string
  description?: string
  placeholder?: string
  /** For renderers. This package never reads or checks it. */
  ui?: Record<string, unknown>
  /** In a row: how many of its 12 columns the element takes. */
  span?: number
  [prop: string]: unknown
}

/** The types of a layout's own nodes. Any other `type` in a layout is a display element. */
export const LAYOUT_TYPES = ['section', 'row', 'slot'] as const

/** How many columns a row has. */
export const ROW_COLUMNS = 12
