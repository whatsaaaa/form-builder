---
description: Put the fields of a definition in sections, rows of a 12-column grid and slots, with the layout.
---

# Layout

Without a layout, a form shows its fields one after another, in the order of `fields`. A `layout` puts them in sections, rows of a 12-column grid and steps, and leaves slots for content of your app. Below you will learn how to write one.

## Adding a layout

`layout` goes next to `fields`. It holds `items`, for a form on one page, or `steps`, for a form over several pages. Here, a delivery section and a summary sit side by side:

```json
{
  "version": "1",
  "fields": [
    { "name": "name", "type": "text", "label": "Name", "required": true },
    {
      "name": "email",
      "type": "email",
      "label": "Email",
      "required": true
    },
    {
      "name": "address",
      "type": "group",
      "label": "Address",
      "fields": [
        {
          "name": "street",
          "type": "text",
          "label": "Street",
          "required": true
        },
        {
          "name": "city",
          "type": "text",
          "label": "City",
          "required": true
        },
        { "name": "zip", "type": "text", "label": "ZIP code" }
      ]
    },
    { "name": "coupon", "type": "text", "label": "Coupon" },
    {
      "name": "acceptTerms",
      "type": "checkbox",
      "label": "I accept the terms",
      "required": true
    }
  ],
  "layout": {
    "items": [
      {
        "type": "row",
        "items": [
          {
            "type": "section",
            "id": "delivery",
            "label": "Delivery",
            "span": 8,
            "items": [
              { "type": "row", "items": ["name", "email"] },
              {
                "field": "address",
                "items": [
                  "street",
                  {
                    "type": "row",
                    "items": [{ "field": "city", "span": 8 }, "zip"]
                  }
                ]
              }
            ]
          },
          {
            "type": "section",
            "id": "summary",
            "label": "Summary",
            "items": ["*", { "type": "slot", "name": "submit" }]
          }
        ]
      }
    ]
  }
}
```

A layout never changes the value. `fields` alone decides its shape, its validation and the output, so a definition submits the same with any layout.

## Items

A list of items can hold:

| Item      | Written as                               | What it is                                                                                         |
| --------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| A field   | `"email"`, `"address.city"`              | a field, by its dot path from the fields around it                                                 |
| A field   | `{ "field": "address", "items": [...] }` | a field with options: `items` lays out the fields of a group or of each item of a list, and `span` |
| The rest  | `"*"`                                    | every field placed nowhere else, in the order of `fields`                                          |
| A section | `{ "type": "section", "items": [...] }`  | a block with an optional `label` and `description`, like a fieldset                                |
| A row     | `{ "type": "row", "items": [...] }`      | one line of a 12-column grid                                                                       |
| A slot    | `{ "type": "slot", "name": "submit" }`   | where your app puts its own content, like a submit button                                          |
| Text      | `{ "type": "paragraph", "text": "..." }` | a display element, written as in `fields`, with `id` instead of `name`                             |

Lists of items are never empty. Sections, rows and display elements can have an `id`, unique across the layout, and sections and rows can have a `ui` for your renderer, like `{ "variant": "card" }`.

## Placing every field

Every field is placed once:

- **Placing a group or a list places every field inside it.** With `items`, you lay out its fields yourself, by their paths inside it: `"street"` within `{ "field": "address" }`.
- **`"*"` places the rest**, once per list of fields: the form's, across all steps, and each group's or list's `items`.
- **A field placed nowhere is an issue**, so a required field can't vanish and leave a form nobody can submit. A field placed twice is an issue too.
- **Paths go through groups**, so `"address.city"` places the city on its own, even on another step than the rest of its group. The value still nests it. A field of a list's items can't be placed on its own, as it has no index outside its item: place the list, and lay out its items with `items`.

## Rows

A row is one line of a 12-column grid. Each item of a row takes `span` columns, from 1 to 12. Items without a `span` share the columns the others leave equally, so `["name", "email"]` is 6 and 6, and `[{ "field": "city", "span": 8 }, "zip"]` is 8 and 4.

- The spans add up to 12 at most, and the shares must come out whole.
- A row never wraps. A second line is a second row.
- `span` is for the items of a row only, and `"*"` can't be a cell. A section in a row can hold it.

The spans are for a wide screen. The layout says nothing about narrow ones: your renderer decides, like giving each cell the whole row below a width of its choice.

## Slots

A slot is a place for content of your app that isn't a field, like a submit button, a price summary or a captcha. The renderer fills it by its `name`: with a named slot in Vue, or with `slots` in React. See [layout components](/frameworks/layout-components).

## Text in the layout

Display elements can be written straight into the layout, where they go:

```json
{
  "version": "1",
  "fields": [{ "name": "email", "type": "email", "required": true }],
  "layout": {
    "items": [
      { "type": "heading", "id": "intro", "text": "Stay in touch" },
      "email"
    ]
  }
}
```

Display elements in `fields` are placed like other fields, and `"*"` places them too. `section`, `row` and `slot` are the layout's own types, so a field type of yours with one of those names can't be a display element in the layout.

## Next steps

A layout with `steps` splits the form into pages. Continue to [steps](/guide/steps) to learn how they validate.
