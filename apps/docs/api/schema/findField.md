---
description: The field at a dot path in a field tree.
---

# findField

Finds the field at a dot path in a field tree.

```ts
const node = findField(nodes, path, options)
```

## Parameters

- `nodes` <code>readonly [FieldNode](/api/schema/FieldNode)[]</code>
- `path` <code>string</code>
- `options` <code>{ placed?: boolean }</code>: optional

### Explanation

A path that names no field is a mistake in the code, so it throws a `TypeError`. With `placed: true`, so does a field of a list's items, which has no index outside its item and can't be rendered on its own: place the list instead.

## Returns

- `node` <code>[FieldNode](/api/schema/FieldNode)</code>

## Related

### Functions

- [dotPathOf](/api/schema/dotPathOf)
- [selectFields](/api/schema/selectFields)

### Guides

- [Placing fields](/frameworks/placing-fields)
