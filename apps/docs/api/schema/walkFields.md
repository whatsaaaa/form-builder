---
description: Every field of a definition, at every depth, in document order.
---

# walkFields

Yields every field of a definition, at every depth, in document order.

```ts
for (const field of walkFields(definition)) {
  // ...
}
```

## Parameters

- `definition` <code>[JsonForm](/api/schema/JsonForm)</code>

### Explanation

A group or a list comes before its fields, and the fields of a list's items come once, with `'*'` in place of the index: `dataPath` is `['lines', '*', 'quantity']`. A field without a name, and a display element even with one, has its parent's `dataPath`.

It reads the built-in `group` and `array` types and needs no builder, so it doesn't check the definition, and gives no kinds. With your own container types, use the builder's [`walkFields`](/api/schema/SchemaBuilder#walkfields), which also gives each field's kind.

## Returns

- `fields` <code>Generator&lt;[WalkedField](/api/schema/WalkedField)&gt;</code>

## Related

### Types

- [WalkedField](/api/schema/WalkedField)

### Functions

- [getInitialInput](/api/schema/getInitialInput)
- [allFields](/api/schema/allFields)
