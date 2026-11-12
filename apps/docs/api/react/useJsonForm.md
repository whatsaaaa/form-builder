---
description: Creates a Formisch form for a definition, in React, with its schema and initial input.
---

# useJsonForm

Creates a Formisch form for a definition, with its schema and initial input from the builder, and the state `<JsonFields>` renders. The form starts with the definition's defaults, and with the `initialInput` of the options over them.

```ts
const jsonForm = useJsonForm(definition, options)
const jsonForm = useJsonForm<TInput, TOutput>(definition, options)
```

## Generics

- `TInput` <code>extends object</code>
- `TOutput` <code>extends object</code>

## Parameters

- `definition` <code>[JsonForm](/api/schema/JsonForm)</code>
- `options` <code>[UseJsonFormOptions](/api/react/UseJsonFormOptions)</code>: optional, with `initialInput` typed by `TInput` when you give it

### Explanation

A definition with issues throws the builder's `DefinitionError`, so run `validate()` first when it comes from outside your code. Like Formisch's `useForm`, it reads the definition, the builder, the initial input and the validation modes on the first render: give the component a new `key` to use another definition, or to start again with other values. The components and layout components are read on every render.

With conditions, it clears the fields they clear as soon as they do, with Formisch's `setInput`, wherever the fields are rendered. With your input type, and your output type when it differs, the form is typed, so Formisch checks paths and values. See [TypeScript](/guide/typescript#typing-the-form).

## Returns

- `jsonForm` <code>[JsonFormInstance](/api/react/JsonFormInstance)</code>

## Examples

### A new form

<<< @/snippets/react/SignUpForm.tsx

### Editing a record

`initialInput` starts the form with the values of a record. See [initial input](/api/react/UseJsonFormOptions#initial-input) for how it goes over the defaults.

<<< @/snippets/react/EditCustomer.tsx

## Related

### Guides

- [React](/frameworks/react)
- [Field components](/frameworks/field-components)

### Components

- [JsonFields](/api/react/JsonFields)
- [JsonField](/api/react/JsonField)
