import type { JsonLayoutRow, JsonLayoutSection, JsonLayoutStep } from '../definition/json-layout'
import type { DefinitionPath } from '../errors/definition-error'
import type { FieldNode } from './field-tree'

/** A definition's layout, with every reference resolved, as the builder's `getLayout` gives it. */
export interface FormLayout {
  /** At least one. A layout with `items`, or none, is one step. */
  readonly steps: readonly LayoutStep[]
  /** The layout's `ui`, as written. */
  readonly ui: Readonly<Record<string, unknown>> | undefined
}

/** One page of a layout. */
export interface LayoutStep {
  /**
   * The step as written, with its `id`, `label`, `description` and `ui`. The one step of a layout
   * with `items` is `{ items }`, and that of a definition without a layout `{ items: ['*'] }`.
   */
  readonly step: JsonLayoutStep
  /**
   * Where the step is in the definition: `['layout', 'steps', 1]`, or `['layout']` for the one step
   * of a layout with `items`, and `[]` for that of a definition without a layout.
   */
  readonly definitionPath: DefinitionPath
  readonly children: readonly LayoutNode[]
  /**
   * Every field with a value placed in the step, in layout order, at every depth: a group or an
   * array comes before its fields, and the fields of an array's items come once.
   */
  readonly fields: readonly FieldNode[]
}

/** One node of a layout. Containers hold their items in `children`. */
export type LayoutNode = LayoutField | LayoutSection | LayoutRow | LayoutSlot

interface LayoutNodeBase {
  /** Unique among its siblings, and the same for the life of the layout: a key for renderers. */
  readonly key: string
  /** How many of its row's 12 columns the node takes. 12 outside a row. */
  readonly span: number
}

/** A field, or a display element, whether it is in `fields` or written in the layout. */
export interface LayoutField extends LayoutNodeBase {
  readonly type: 'field'
  /** The field as `getFieldTree` gives it. A display element written in the layout is one too. */
  readonly node: FieldNode
  /**
   * For a group, the layout of its fields, and for an array, the layout of one item. Render these,
   * not `node.children`: the layout can reorder them and add display elements. Else empty.
   */
  readonly children: readonly LayoutNode[]
}

/** A block of items with a title. */
export interface LayoutSection extends LayoutNodeBase {
  readonly type: 'section'
  /** The section as written, with its `id`, `label`, `description` and `ui`. */
  readonly section: JsonLayoutSection
  /** Where the section is in the definition: `['layout', 'steps', 0, 'items', 2]`. */
  readonly definitionPath: DefinitionPath
  readonly children: readonly LayoutNode[]
}

/** One line of a 12-column grid. Its `children` each take their `span`: 12 columns at most. */
export interface LayoutRow extends LayoutNodeBase {
  readonly type: 'row'
  /** The row as written, with its `id` and `ui`. */
  readonly row: JsonLayoutRow
  /** Where the row is in the definition: `['layout', 'items', 1]`. */
  readonly definitionPath: DefinitionPath
  readonly children: readonly LayoutNode[]
}

/** Where the app puts its own content. */
export interface LayoutSlot extends LayoutNodeBase {
  readonly type: 'slot'
  readonly name: string
}
