---
description: Your React component for each layout type, and the props each one gets.
---

# LayoutComponents

Your component for each layout type a definition's layout uses: `{ section: Card, row: Grid }`. A definition without sections or rows needs none.

```ts
interface LayoutComponents {
  section?: ComponentType<SectionProps>
  row?: ComponentType<RowProps>
}
```

## Explanation

See [layout components](/frameworks/layout-components).

## SectionProps

- `SectionProps`
  - `section` [`JsonLayoutSection`](/api/schema/JsonLayout#jsonlayoutsection): the section as written
  - `children` `ReactNode`: the section's items

## RowProps

- `RowProps`
  - `row` [`JsonLayoutRow`](/api/schema/JsonLayout#jsonlayoutrow): the row as written
  - `spans` `number[]`: how many of the 12 columns each cell takes
  - `children` `(index: number) => ReactNode`: renders the cell at `index`

## Related

### Types

- [FieldComponents](/api/react/FieldComponents)
