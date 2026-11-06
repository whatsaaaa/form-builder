---
'@whatsaaaa/form-builder-schema': minor
---

The builder's `walkFields` gives each field its `kind`, e.g. `'number'`, or `'none'` for a display element, and `itemKind` for an array whose type has one, e.g. `'file'` for a multiple file field. Adapters use them to turn an input's `'5'` into `5`, and to tell a group from a repeater, your own container types included.

```ts
for (const { dataPath, kind, itemKind } of builder.walkFields(json)) {
  // ['photos'], 'array', 'file'
}
```

The `walkFields` function, which needs no builder, leaves them out, and so does the builder for a field with issues.
