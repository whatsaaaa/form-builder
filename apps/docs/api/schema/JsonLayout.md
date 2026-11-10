---
description: The layout of a definition, and its steps, sections, rows, slots and items.
---

# JsonLayout

Where the fields of a definition go. It holds `items`, for one page, or `steps`, for several.

```ts
type JsonLayout =
  | { items: readonly JsonLayoutItem[]; ui?: Record<string, unknown> }
  | { steps: readonly JsonLayoutStep[]; ui?: Record<string, unknown> }
```

## Explanation

See [layout](/guide/layout) and [steps](/guide/steps). The builder's `getLayout()` gives the layout with every reference resolved, as a [`FormLayout`](/api/schema/FormLayout).

## JsonLayoutStep

- `JsonLayoutStep`
  - `id` `string`: optional, unique across the layout
  - `label` `string`: optional
  - `description` `string`: optional
  - `items` `readonly JsonLayoutItem[]`
  - `ui` `Record<string, unknown>`: optional

## JsonLayoutItem

```ts
type JsonLayoutItem =
  | string
  | JsonLayoutField
  | JsonLayoutSection
  | JsonLayoutRow
  | JsonLayoutSlot
  | JsonLayoutDisplay
```

A string is a field by its dot path, or `'*'` for every field not placed elsewhere.

## JsonLayoutField

- `JsonLayoutField`
  - `field` `string`: its dot path, from the fields around it
  - `items` `readonly JsonLayoutItem[]`: optional, lays out the fields of a group or of each item of a list
  - `span` `number`: optional, in a row

## JsonLayoutSection

- `JsonLayoutSection`
  - `type` `'section'`
  - `id` `string`: optional
  - `label` `string`: optional
  - `description` `string`: optional
  - `items` `readonly JsonLayoutItem[]`
  - `ui` `Record<string, unknown>`: optional
  - `span` `number`: optional, in a row

## JsonLayoutRow

- `JsonLayoutRow`
  - `type` `'row'`
  - `id` `string`: optional
  - `items` `readonly JsonLayoutItem[]`: its cells
  - `ui` `Record<string, unknown>`: optional
  - `span` `number`: optional, in a row

## JsonLayoutSlot

- `JsonLayoutSlot`
  - `type` `'slot'`
  - `name` `string`
  - `span` `number`: optional, in a row

## JsonLayoutDisplay

- `JsonLayoutDisplay`
  - `type` `string`: a display element's type, like `'heading'`
  - `id` `string`: optional
  - `span` `number`: optional, in a row
  - `[prop: string]` `unknown`: its type's props, like `text`

## Related

### Types

- [FormLayout](/api/schema/FormLayout)
- [JsonForm](/api/schema/JsonForm)
