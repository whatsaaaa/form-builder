---
description: Render the sections, rows and slots of a definition's layout with components of your own.
---

# Layout components

A definition's [layout](/guide/layout) puts its fields in sections, rows of a 12-column grid and steps, and leaves slots for your content. `<JsonFields>` renders it with a component of yours for each layout type. Below you will learn how to write them.

## Sections and rows

A section gets the section as written, and renders its items. A row gets the span of each cell, and renders each cell:

::: code-group

<<< @/snippets/vue/LayoutSection.vue [Vue: LayoutSection.vue]

<<< @/snippets/vue/LayoutRow.vue [Vue: LayoutRow.vue]

<<< @/snippets/react/layout.tsx#components [React]

<<< @/snippets/react/row.css [React: CSS]

:::

| Layout type | Props                                                                 | Content                  |
| ----------- | --------------------------------------------------------------------- | ------------------------ |
| `section`   | `section`, as written, with its `id`, `label`, `description` and `ui` | the section's items      |
| `row`       | `row`, as written, with its `id` and `ui`, and `spans`, one per cell  | the cell at each `index` |

In Vue, the content is the default slot, with `{ index }` for a row. In React, it is `children`, and `children(index)` for a row.

## Rendering the layout

Pass the components as `layoutComponents`, and fill the layout's slots: with named slots in Vue, or with `slots` in React:

::: code-group

<<< @/snippets/vue/CheckoutForm.vue [Vue]

<<< @/snippets/react/layout.tsx#form [React]

:::

- A layout type that the layout uses without a component, or a slot without content, throws a `TypeError` that names each one when `<JsonFields>` first renders, for every step, not only the current one.
- A definition without sections or rows needs no layout components, and one without a `layout` renders its fields in order.
- Display elements written in the layout render with your field components, like those in `fields`.
- A section or a row whose fields are all hidden or left out with `except` drops out. The other cells of a row keep their spans.

## Screen sizes

The spans are for a wide screen. The layout says nothing about narrow ones, so your row component decides. The rows above give each cell the whole row below 640 pixels. Read `row.ui` or `section.ui` for hints of your own, like `{ "variant": "card" }`.

## Next steps

Continue to [multi-step forms](/frameworks/multi-step-forms) to render a layout with steps.
