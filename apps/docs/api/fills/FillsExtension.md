---
description: 'The type of the extension fills() gives, with the key it adds, for defineForm.'
---

# FillsExtension

The extension [`fills()`](/api/fills/fills) gives. It is a [`SchemaExtension`](/api/schema/SchemaExtension), typed with the key it adds, so `defineForm()` types `fills` on fields. `TSource` is the name of each source it was given, or any string without them.

```ts
interface FillsExtension<
  TSource extends string = string,
> extends SchemaExtension {
  readonly fieldProps: FillsPropsSchema<TSource>
}
```

## FillsPropsSchema

The Valibot schema of the key the package adds: an optional `fills`, a [`Fill`](/api/fills/Fill).

```ts
type FillsPropsSchema<TSource extends string = string> = ObjectSchema<
  {
    readonly fills: OptionalSchema<
      LazySchema<GenericSchema<Fill<TSource>>>,
      undefined
    >
  },
  undefined
>
```

## Example

<<< @/snippets/schema/fills.ts#define

## Related

### Guides

- [TypeScript](/guide/typescript)

### Functions

- [fills](/api/fills/fills)
