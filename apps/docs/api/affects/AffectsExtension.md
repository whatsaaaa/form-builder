---
description: The type of the extension affects() gives, with the key it adds, for defineForm.
---

# AffectsExtension

The extension [`affects()`](/api/affects/affects) gives. It is a [`SchemaExtension`](/api/schema/SchemaExtension), typed with the key it adds, so `defineForm()` types `affects` on fields, steps, sections and display elements.

```ts
interface AffectsExtension extends SchemaExtension {
  readonly fieldProps: AffectsPropsSchema
  readonly layoutProps: AffectsPropsSchema
}
```

## AffectsPropsSchema

The Valibot schema of the key the package adds: an optional `affects`, a list of [`Affect`](/api/affects/Affect)s.

```ts
type AffectsPropsSchema = ObjectSchema<
  {
    readonly affects: OptionalSchema<
      ArraySchema<LazySchema<GenericSchema<Affect>>>
    >
  },
  undefined
>
```

## Related

### Guides

- [TypeScript](/guide/typescript)

### Functions

- [affects](/api/affects/affects)
