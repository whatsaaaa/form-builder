---
description: A build context for testing a field type on its own.
---

# createBuildContext

Creates a build context for testing a field type's `schema()` on its own, without a definition around it.

```ts
const ctx = createBuildContext(overrides)
```

## Parameters

- `overrides` <code>Partial&lt;[BuildContext](/api/schema/FieldTypeDef#buildcontext)&gt;</code>: optional, replaces any member, like `path`

### Explanation

Its `buildFields` and `buildField` use the default registries, and throw a `DefinitionError` when the child fields have issues. Its `path` defaults to `[]`.

## Returns

- `ctx` <code>[BuildContext](/api/schema/FieldTypeDef#buildcontext)</code>

## Example

<<< @/snippets/schema/custom-field-types.ts#test

## Related

### Guides

- [Custom field types](/guide/custom-field-types#testing-a-type)

### Types

- [FieldTypeDef](/api/schema/FieldTypeDef#buildcontext)
