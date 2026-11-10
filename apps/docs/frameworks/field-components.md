---
description: Write the Vue or React component for each field type, by its role, for the adapters to render.
---

# Field components

The adapters render each field with your component for its type. Below you will learn what each component gets, and how to write one for every built-in type.

## Components by type

`components` maps each field type to a component, by type name. Several types can share one:

::: code-group

<<< @/snippets/vue/all-fields.ts [Vue]

<<< @/snippets/react/all-fields.ts [React]

:::

Pass it to `useJsonForm`, or to `<JsonFields>` and `<JsonField>` as a prop. A type that a definition uses but `components` doesn't have throws a `TypeError` that names every missing type when `<JsonFields>` or `<JsonField>` first renders. Only the fields it renders count, and their fields at any depth, so a missing component shows up at once, not when its field first appears, like in a new list item.

## Roles

What a component gets depends on the field's role:

| Role      | Which fields                             | Props                                                                               |
| --------- | ---------------------------------------- | ----------------------------------------------------------------------------------- |
| `value`   | every field with a value                 | `field`, `path`, `kind`, `required`, `input`, `errors`, `inputProps`, `setInput`    |
| `group`   | a group, or a container of kind `object` | `field`, `path`, and the group's fields                                             |
| `array`   | a list, or a container of kind `array`   | `field`, `path`, `items`, `errors`, `add`, `remove`, `move`, and each item's fields |
| `display` | a heading, a paragraph, a divider        | `field`                                                                             |

In Vue, a group renders its fields in its default slot, and a list each item's fields in its default slot, with `{ index }`. In React, a group gets them as `children`, and a list as `children(index)`. Your own types render through the role of their kind.

## Value fields

A value field gets the field from the definition, its state in Formisch, and a setter:

::: code-group

<<< @/snippets/vue/TextInput.vue [Vue]

<<< @/snippets/react/TextInput.tsx [React]

:::

- `field` is the field from the definition, with its `label`, `placeholder`, `options` and `ui`.
- `path` is its Formisch path with real indexes, like `['lines', 0, 'quantity']`.
- `input` is the field's current input, and `errors` its messages, or `null`.
- `inputProps` are Formisch's element props: the field's name, a ref, and its focus, change and blur handlers. Bind them to the input element, so Formisch knows when the field is touched and can focus it after a failed submit.
- `required` is true when the definition makes the field required, like for an asterisk. The schema does the checking.

## Setting the value

`setInput` sets the field's input, after turning what an input element gives into what the schema expects, by the field's kind:

| Kind                | Input                   | Value set                      |
| ------------------- | ----------------------- | ------------------------------ |
| `number`            | `''` or only spaces     | `undefined`                    |
| `number`            | a numeric string, `'5'` | `5`                            |
| `file`              | a `FileList`            | its first file, or `undefined` |
| `array` of `file`   | a `FileList`            | a list of its files            |
| `array` of `number` | numeric strings         | numbers                        |

Anything else is set as it is, and the schema reports it if it doesn't fit. In React, your `onChange` after the spread of `inputProps` replaces Formisch's, and calls `setInput` instead. `setInput` stays the same function while the field is the same, so it is safe in the dependencies of an effect.

## Choices

An element's value is always a string. To keep `2` a number and `false` a boolean, set the option's own value from `field.options`, and use each option's index as the element's value:

::: code-group

<<< @/snippets/vue/SelectInput.vue [Vue]

<<< @/snippets/react/SelectInput.tsx [React]

:::

- A radio sets its option's value when it is picked, and is checked while `input` is that value.
- A multiselect's value is a list of option values. A checkbox for an option adds its value to the list, or takes it out.
- A `select` without `options`, because they load from an API, is a text input. With `"valueType": "number"`, its kind is `number`, so `setInput` turns what is typed into a number.

## Files

Pass the element's `files` to `setInput`, and never set a file input's value:

::: code-group

<<< @/snippets/vue/FileInput.vue [Vue]

<<< @/snippets/react/FileInput.tsx [React]

:::

## Groups

A group renders its fields where you put them:

::: code-group

<<< @/snippets/vue/GroupFieldset.vue [Vue]

<<< @/snippets/react/GroupFieldset.tsx [React]

:::

## Lists

A list renders each item's fields, with buttons to add and remove items:

::: code-group

<<< @/snippets/vue/ListRepeater.vue [Vue]

<<< @/snippets/react/ListRepeater.tsx [React]

:::

- `items` has one id per item. Use it as the key, so each item keeps its inputs when one before it is removed or moved.
- `add()` adds an item at the end, with the defaults its fields have in the definition. `remove(index)` and `move(from, to)` work as in Formisch.
- `errors` are the list's own messages, like a required list's or `maxLength`'s. Its items' fields show their own.

## Display elements

A display element only gets its `field`, with its `text` and other props:

::: code-group

<<< @/snippets/vue/FormHeading.vue [Vue]

<<< @/snippets/react/FormHeading.tsx [React]

:::

In Vue, declare the props even when a component doesn't use them, like a divider's, or Vue adds `field` to its element as an attribute.

## Next steps

Continue to [layout components](/frameworks/layout-components) to render the sections, rows and slots of a layout.
