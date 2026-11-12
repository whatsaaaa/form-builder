---
description: 'The options of useJsonForm in React: the builder, the initial input, your components and the validation modes.'
---

# UseJsonFormOptions

The options of [`useJsonForm`](/api/react/useJsonForm).

## Generics

- `TSchema` <code>extends FormSchema</code>

## Definition

- `UseJsonFormOptions`
  - `builder` <code>[SchemaBuilder](/api/schema/SchemaBuilder)</code>: optional, builds the schema and knows your own types and rules. Defaults to `createSchemaBuilder()`
  - `initialInput` <code>DeepPartial&lt;InferInput&lt;TSchema&gt;&gt;</code>: optional, the values the form starts with, over the definition's defaults
  - `components` <code>[FieldComponents](/api/react/FieldComponents)</code>: optional, your component for each field type
  - `layoutComponents` <code>[LayoutComponents](/api/react/LayoutComponents)</code>: optional, your component for each layout type
  - `validate` <code>ValidationMode</code>: optional, when a field is validated the first time, as in Formisch
  - `revalidate` <code>Exclude&lt;ValidationMode, 'initial'&gt;</code>: optional, when it is validated again, as in Formisch

### Explanation

`TSchema` is the form's schema: [`BuiltSchema`](/api/schema/BuiltSchema) in `useJsonForm()`, where `initialInput` takes any object, and [`TypedBuiltSchema`](/api/schema/TypedBuiltSchema) in `useJsonForm<TInput, TOutput>()`, where it takes your input type with every key optional, at every depth. It is typed like Formisch's own `initialInput`, which takes a nested type whole when it is an interface: write that one as a type alias to give a part of it.

## Initial input

`initialInput` goes over the definition's defaults, and the result is the form's initial input: what Formisch's `reset` goes back to, and what `isDirty` compares with.

- **A field without a key** keeps its `default`.
- **A key that is there wins**, with any value. `undefined` starts the field blank, without its default, and so does `null`, which every built-in kind reads as empty.
- **A group** is merged field by field, at every depth. Given anything but an object, its fields start blank.
- **A list** is taken whole, in place of its `default`, so `[]` starts it empty. Each item of a list with `fields` is merged over what a new item starts with, so it keeps the defaults of the fields it leaves out. Given anything but an array, the list starts empty.
- **A key that is no field** of the definition is ignored.
- **Values aren't checked or converted.** Give each field the value its schema expects, like a number for a number field: your components get it as given, and the schema reports a wrong one when the form validates.
- **With [conditions](/guide/conditions)**, a field they clear for that input starts blank, whatever it was given. A hidden field they don't clear keeps its value.
- **It is read once**, with the definition. To start again with other values, give the component that calls `useJsonForm` a new `key`.

## Example

<<< @/snippets/react/options.ts#options

## Related

### Hooks

- [useJsonForm](/api/react/useJsonForm)
