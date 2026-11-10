---
description: Renders the fields of a useJsonForm form in Vue, where the layout puts them.
---

# JsonFields

Renders the fields of a `useJsonForm` form with your components, where the definition's layout puts them: the current step, with its sections, rows and slots.

```ts
<JsonFields :of="jsonForm" />
```

## Parameters

- `of` <code>[AnyJsonFormInstance](/api/vue/JsonFormInstance)</code>: what `useJsonForm` returned
- `components` <code>[FieldComponents](/api/vue/FieldComponents)</code>: optional, defaults to those `useJsonForm` got
- `layoutComponents` <code>[LayoutComponents](/api/vue/LayoutComponents)</code>: optional, defaults to those `useJsonForm` got
- `only` <code>readonly string[]</code>: optional, renders only these fields, by path, in the order of the definition, without the layout
- `except` <code>readonly string[]</code>: optional, leaves out these fields, by path
- `step` <code>number</code>: optional, renders the step at this index instead of the current one

### Explanation

It renders nothing of its own, so put it inside Formisch's `<Form>`, with your own submit button. It leaves out what conditions hide. A field type or layout type without a component, or a slot without content, throws a `TypeError` that names each one. Its named slots fill the layout's slots. `only` and `except` are read when it sets up.

## Example

<<< @/snippets/vue/CheckoutForm.vue

## Related

### Guides

- [Layout components](/frameworks/layout-components)
- [Placing fields](/frameworks/placing-fields)

### Components

- [JsonField](/api/vue/JsonField)
