---
description: Creates a Formisch form for a definition, in React, with its schema and initial input.
---

# useJsonForm

Creates a Formisch form for a definition, with its schema and initial input from the builder, and the state `<JsonFields>` renders.

```ts
const jsonForm = useJsonForm(definition, options)
const jsonForm = useJsonForm<TInput, TOutput>(definition, options)
```

## Generics

- `TInput` <code>extends object</code>
- `TOutput` <code>extends object</code>

## Parameters

- `definition` <code>[JsonForm](/api/schema/JsonForm)</code>
- `options` <code>[UseJsonFormOptions](/api/react/UseJsonFormOptions)</code>: optional

### Explanation

A definition with issues throws the builder's `DefinitionError`, so run `validate()` first when it comes from outside your code. Like Formisch's `useForm`, it reads the definition, the builder and the validation modes on the first render: give the component a new `key` to use another definition. The components and layout components are read on every render.

With conditions, it clears the fields they clear as soon as they do, with Formisch's `setInput`, wherever the fields are rendered. With your input type, and your output type when it differs, the form is typed, so Formisch checks paths and values. See [TypeScript](/guide/typescript#typing-the-form).

## Returns

- `jsonForm` <code>[JsonFormInstance](/api/react/JsonFormInstance)</code>

## Example

<<< @/snippets/react/SignUpForm.tsx

## Related

### Guides

- [React](/frameworks/react)
- [Field components](/frameworks/field-components)

### Components

- [JsonFields](/api/react/JsonFields)
- [JsonField](/api/react/JsonField)
