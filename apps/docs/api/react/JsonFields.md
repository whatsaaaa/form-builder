---
description: Renders the fields of a useJsonForm form in React, where the layout puts them.
---

# JsonFields

Renders the fields of a `useJsonForm` form with your components, where the definition's layout puts them: the current step, with its sections, rows and slots.

```ts
<JsonFields of={jsonForm} />
```

## Parameters

- `of` <code>[AnyJsonFormInstance](/api/react/JsonFormInstance)</code>: what `useJsonForm` returned
- `components` <code>[FieldComponents](/api/react/FieldComponents)</code>: optional, defaults to those `useJsonForm` got
- `layoutComponents` <code>[LayoutComponents](/api/react/LayoutComponents)</code>: optional, defaults to those `useJsonForm` got
- `slots` <code>Readonly&lt;Record&lt;string, ReactNode&gt;&gt;</code>: optional, the content of the layout's slots, by name
- `only` <code>readonly string[]</code>: optional, renders only these fields, by path, in the order of the definition, without the layout
- `except` <code>readonly string[]</code>: optional, leaves out these fields, by path
- `step` <code>number</code>: optional, renders the step at this index instead of the current one

### Explanation

It renders nothing of its own, so put it inside Formisch's `<Form>`, with your own submit button. It leaves out what conditions hide. A field type or layout type without a component, or a slot without content, throws a `TypeError` that names each one.

## Example

<<< @/snippets/react/layout.tsx#form

## Related

### Guides

- [Layout components](/frameworks/layout-components)
- [Placing fields](/frameworks/placing-fields)

### Components

- [JsonField](/api/react/JsonField)
