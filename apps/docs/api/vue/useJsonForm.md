---
description: Creates a Formisch form for a definition, in Vue, with its schema and initial input.
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
- `options` <code>[UseJsonFormOptions](/api/vue/UseJsonFormOptions)</code>: optional

### Explanation

A definition with issues throws the builder's `DefinitionError`, so run `validate()` first when it comes from outside your code. The definition is read once, when the component sets up: give the component a new `:key` to use another one.

With conditions, it clears the fields they clear as soon as they do, with Formisch's `setInput`, wherever the fields are rendered. With your input type, and your output type when it differs, the form is typed, so Formisch checks paths and values. See [TypeScript](/guide/typescript#typing-the-form).

## Returns

- `jsonForm` <code>[JsonFormInstance](/api/vue/JsonFormInstance)</code>

## Example

<<< @/snippets/vue/SignUpForm.vue

## Related

### Guides

- [Vue](/frameworks/vue)
- [Field components](/frameworks/field-components)

### Components

- [JsonFields](/api/vue/JsonFields)
- [JsonField](/api/vue/JsonField)
