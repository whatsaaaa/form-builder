---
description: Renders one field of a useJsonForm form in React, wherever you put it.
---

# JsonField

Renders one field of a `useJsonForm` form, wherever you put it inside Formisch's `<Form>`.

```ts
<JsonField of={jsonForm} path="coupon" />
```

## Parameters

- `of` <code>[AnyJsonFormInstance](/api/react/JsonFormInstance)</code>: what `useJsonForm` returned
- `path` <code>string</code>: the field's dot path, like `'address.city'`
- `components` <code>[FieldComponents](/api/react/FieldComponents)</code>: optional, defaults to those `useJsonForm` got

### Explanation

A group or a list comes with its fields. Leave the field out of `<JsonFields>` with `except`, so it renders once. It renders nothing while conditions hide the field. A path that names no field, or a field of a list's items, throws a `TypeError`.

## Example

<<< @/snippets/react/OrderForm.tsx

## Related

### Guides

- [Placing fields](/frameworks/placing-fields)

### Components

- [JsonFields](/api/react/JsonFields)
