---
description: 'The schema type of build<TInput, TOutput>(): your types, so Formisch checks paths and values.'
---

# TypedJsonFormSchema

The schema type of `build<TInput, TOutput>()` and of the adapters' `useJsonForm<TInput, TOutput>()`: your types, so Formisch's paths and values are checked.

```ts
type TypedJsonFormSchema<TInput, TOutput = TInput> = GenericSchema<
  TInput,
  TOutput
>
```

## Generics

- `TInput` <code>extends object</code>
- `TOutput` <code>extends object</code>

## Explanation

It is the same schema as [`JsonFormSchema`](/api/schema/JsonFormSchema), with your types. An interface works as the type, which Formisch's own constraint wouldn't take as it is. The types are a promise you make: nothing checks them against the definition.

## Related

### Guides

- [TypeScript](/guide/typescript#typing-the-form)
