---
description: Your Vue component for each layout type, and the props each one gets.
---

# LayoutComponents

Your component for each layout type a definition's layout uses: `{ section: Card, row: Grid }`. A definition without sections or rows needs none.

```ts
interface LayoutComponents {
  section?: Component
  row?: Component
}
```

## Explanation

See [layout components](/frameworks/layout-components).

## SectionProps

- `SectionProps`
  - `section` [`JsonLayoutSection`](/api/schema/JsonLayout#jsonlayoutsection): the section as written

Its default slot, typed as `SectionSlots`, renders the section's items.

## RowProps

- `RowProps`
  - `row` [`JsonLayoutRow`](/api/schema/JsonLayout#jsonlayoutrow): the row as written
  - `spans` `number[]`: how many of the 12 columns each cell takes

Its default slot, typed as `RowSlots`, renders the cell at `index`: `<slot :index="index" />`.

## Related

### Types

- [FieldComponents](/api/vue/FieldComponents)
