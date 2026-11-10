---
description: A definition's layout with every reference resolved, as getLayout gives it.
---

# FormLayout

A definition's layout, with every reference resolved, as the builder's [`getLayout()`](/api/schema/SchemaBuilder#getlayout) gives it.

## Definition

- `FormLayout`
  - `steps` <code>readonly [LayoutStep](/api/schema/FormLayout#layoutstep)[]</code>: at least one. A layout with `items`, or none, is one step
  - `ui` <code>Readonly&lt;Record&lt;string, unknown&gt;&gt; | undefined</code>: the layout's `ui`, as written

## LayoutStep

- `LayoutStep`
  - `step` [`JsonLayoutStep`](/api/schema/JsonLayout#jsonlayoutstep): the step as written
  - `definitionPath` `DefinitionPath`: where the step is in the definition
  - `children` `readonly LayoutNode[]`
  - `fields` `readonly FieldNode[]`: every field with a value placed in the step, in layout order

## LayoutNode

```ts
type LayoutNode = LayoutField | LayoutSection | LayoutRow | LayoutSlot
```

Every node has a `key`, unique among its siblings and stable, and a `span`, the columns it takes in its row, 12 outside one.

## LayoutField

- `LayoutField`
  - `type` `'field'`
  - `node` [`FieldNode`](/api/schema/FieldNode): the field, or a display element written in the layout
  - `children` `readonly LayoutNode[]`: the layout of a group's fields, or of one item of a list

## LayoutSection

- `LayoutSection`
  - `type` `'section'`
  - `section` [`JsonLayoutSection`](/api/schema/JsonLayout#jsonlayoutsection): the section as written
  - `definitionPath` `DefinitionPath`
  - `children` `readonly LayoutNode[]`

## LayoutRow

- `LayoutRow`
  - `type` `'row'`
  - `row` [`JsonLayoutRow`](/api/schema/JsonLayout#jsonlayoutrow): the row as written
  - `definitionPath` `DefinitionPath`
  - `children` `readonly LayoutNode[]`: its cells

## LayoutSlot

- `LayoutSlot`
  - `type` `'slot'`
  - `name` `string`

## Related

### Guides

- [Rendering with Formisch](/frameworks/formisch#the-layout-tree)

### Types

- [JsonLayout](/api/schema/JsonLayout)
- [FieldNode](/api/schema/FieldNode)
