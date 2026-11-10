---
description: The type of the extension affects() gives, with the key it adds, for defineForm.
---

# AffectsExtension

The extension [`affects()`](/api/affects/affects) gives. It is a [`SchemaExtension`](/api/schema/SchemaExtension), typed with the key it adds, so `defineForm()` types `affects` on fields, steps, sections and display elements.

```ts
interface AffectsExtension extends SchemaExtension {
  readonly fieldProps: typeof affectsProps
  readonly layoutProps: typeof affectsProps
}
```

## Related

### Guides

- [TypeScript](/guide/typescript)

### Functions

- [affects](/api/affects/affects)
