---
description: Place some fields of a definition in your own markup with JsonField, and leave them out of JsonFields.
---

# Placing fields

A definition's [layout](/guide/layout) places its fields. Sometimes your code knows better, like a coupon field that goes in a sidebar next to the order summary. Below you will learn how to place fields in your own markup.

## JsonField

`<JsonField>` renders one field, wherever you put it inside Formisch's `<Form>`. Leave it out of `<JsonFields>` with `except`, so it renders once:

::: code-group

<<< @/snippets/vue/OrderForm.vue [Vue]

<<< @/snippets/react/OrderForm.tsx [React]

:::

A placed field validates, focuses and submits like any other, because it is still part of the one Formisch form. It renders nothing while [conditions](/guide/conditions) hide it.

## Paths

- A path is the field's names joined with dots: `email`, or `address.city` for a field of a group.
- A group or a list comes with all its fields.
- A field of a list's items can't be placed on its own, as it has no index outside its item: place the list. To leave such a field out of every item, use `*` for the index: `except: ['lines.*.note']`.
- A path that names no field throws a `TypeError`, so a typo shows up at once.

## Only some fields

`only` renders just the fields it names, in the order of the definition, without the layout:

::: code-group

```vue [Vue]
<JsonFields :of="jsonForm" :only="['name', 'email']" />
```

```tsx [React]
<JsonFields of={jsonForm} only={['name', 'email']} />
```

:::

Display elements have no dot path, even with a name, so `only` leaves them out. In Vue, `only` and `except` are read when the component sets up.

## Formisch's own components

`jsonForm.form` is a Formisch form, so Formisch's `<Field>` and `useField` work on it too. A field you render that way gets none of the adapter's help, like `setInput` turning `'5'` into `5`, or the defaults of a new list item. Leave it out of `<JsonFields>` with `except`, and type the form so its paths check: see [TypeScript](/guide/typescript#typing-the-form).
