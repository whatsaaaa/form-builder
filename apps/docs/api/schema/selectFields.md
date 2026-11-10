---
description: The fields of a tree that code picks by dot path, with only and except.
---

# selectFields

Gives the fields to render when code picks some by dot path, as a tree like the builder's `getFieldTree` gives.

```ts
const fields = selectFields(nodes, options)
```

## Parameters

- `nodes` <code>readonly [FieldNode](/api/schema/FieldNode)[]</code>
- `options` <code>{ only?: readonly string[]; except?: readonly string[] }</code>: optional

### Explanation

- `only` keeps just the fields it names, in the order of the definition, each with the fields inside it. A display element has no dot path, so it is left out.
- `except` leaves out the fields it names, at any depth. `'lines.*.note'` leaves a field out of every item of a list.

A path that names no field throws a `TypeError`, and so does a field of a list's items in `only`.

## Returns

- `fields` <code>[FieldNode](/api/schema/FieldNode)[]</code>

## Related

### Functions

- [findField](/api/schema/findField)
- [shownNodes](/api/schema/shownNodes)

### Guides

- [Placing fields](/frameworks/placing-fields)
