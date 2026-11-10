---
description: Your React component for each field type, and the props each role gets.
---

# FieldComponents

Your component for each field type, by type name: `{ text: TextInput, group: GroupFieldset }`. Each one gets the props of its type's role.

```ts
type FieldComponents = Record<
  string,
  | ComponentType<ValueFieldProps>
  | ComponentType<GroupFieldProps>
  | ComponentType<ArrayFieldProps>
  | ComponentType<DisplayFieldProps>
>
```

## Explanation

See [field components](/frameworks/field-components).

## ValueFieldProps

- `ValueFieldProps`
  - `field` [`JsonField`](/api/schema/JsonField): the field from the definition
  - `path` `FieldPath`: its Formisch path, with real indexes
  - `kind` [`ValueKind`](/api/schema/ValueKind): the kind of its value
  - `required` `boolean`: whether the definition makes it required
  - `input` `unknown`: its current input
  - `errors` `[string, ...string[]] | null`: its error messages
  - `inputProps` `FieldElementProps`: Formisch's element props, to spread on the input element
  - `setInput` `(input: unknown) => void`: sets the input, after turning what an element gives into the value of its kind

## GroupFieldProps

- `GroupFieldProps`
  - `field` [`JsonField`](/api/schema/JsonField)
  - `path` `FieldPath`
  - `children` `ReactNode`: the group's fields

## ArrayFieldProps

- `ArrayFieldProps`
  - `field` [`JsonField`](/api/schema/JsonField)
  - `path` `FieldPath`
  - `items` `string[]`: one id per item, to use as its `key`
  - `errors` `[string, ...string[]] | null`: the list's own messages
  - `add` `() => void`: adds an item at the end
  - `remove` `(index: number) => void`
  - `move` `(from: number, to: number) => void`
  - `children` `(index: number) => ReactNode`: renders the fields of the item at `index`

## DisplayFieldProps

- `DisplayFieldProps`
  - `field` [`JsonField`](/api/schema/JsonField)

## Example

<<< @/snippets/react/all-fields.ts

## Related

### Types

- [LayoutComponents](/api/react/LayoutComponents)
