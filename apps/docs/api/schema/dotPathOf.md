---
description: A field's dot path, the way code names a field to place it.
---

# dotPathOf

Gives a field's dot path, the way code names a field to place it: `'address.city'`, or `'lines.*.quantity'` for a field of a list's items.

```ts
const path = dotPathOf(node)
```

## Parameters

- `node` <code>[FieldNode](/api/schema/FieldNode)</code>

### Explanation

Undefined for a display element, even one with a name, and for the `of` field of a list of single values, whose value is the item itself.

## Returns

- `path` <code>string | undefined</code>

## Related

### Functions

- [findField](/api/schema/findField)
- [selectFields](/api/schema/selectFields)
