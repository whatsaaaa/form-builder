---
'@whatsaaaa/form-builder-schema': minor
---

Helpers to render a definition with Formisch's own package for any framework, without an adapter. They used to live in the Vue adapter only.

```ts
const builder = createSchemaBuilder()
const form = useForm({ schema: builder.build(json), initialInput: builder.getInitialInput(json) })

for (const node of builder.getFieldTree(json)) {
  // node.role is 'value', 'group', 'array' or 'display'
}
```

- `builder.getFieldTree(json)` gives the fields as a tree of `FieldNode`s, each with its `role`, `kind`, `itemKind`, `dataPath` and `children`. Your own container types are groups or arrays by their kind. It throws a `DefinitionError` like `build()`.
- `builder.getItemInput(field)` is the input of a new item of an array, with the defaults of its fields, for Formisch's `insert()`.
- `coerceInput(input, node)` turns what an input element gives into the field's value: `'5'` into `5`, `''` into `undefined` for a number, and a `FileList` into a file or an array of files.
- `toFieldPath(node.dataPath, indexes)` puts the index of each array item in place of its `'*'`: `['lines', 0, 'qty']`.
- `isRequired(field)` tells whether the definition makes a field required.
- `findField`, `allFields` and `dotPathOf` find fields by their dot path, to place them on their own.
- `build<TInput, TOutput>(json)` returns the same schema typed by your types, as a `TypedJsonFormSchema<TInput, TOutput>`, so Formisch checks paths and values. `JsonFormSchema` names what `build(json)` returns.

The new "Using with Formisch" section of the README shows a whole React renderer, and what Vue does differently.
