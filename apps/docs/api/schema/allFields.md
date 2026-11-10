---
description: Every node of a field tree, in document order.
---

# allFields

Yields every node of a field tree, in document order, a container before its fields.

```ts
for (const node of allFields(nodes)) {
  // ...
}
```

## Parameters

- `nodes` <code>readonly [FieldNode](/api/schema/FieldNode)[]</code>

## Returns

- `nodes` <code>Generator&lt;[FieldNode](/api/schema/FieldNode)&gt;</code>

## Related

### Functions

- [findField](/api/schema/findField)
- [SchemaBuilder.getFieldTree](/api/schema/SchemaBuilder#getfieldtree)
