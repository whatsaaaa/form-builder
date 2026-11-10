---
description: A field's Formisch path, from its dataPath and the indexes of its list items.
---

# toFieldPath

Gives a field's Formisch path: its `dataPath` with each `'*'` replaced by the index of the list item it is in, outermost first.

```ts
const path = toFieldPath(dataPath, indexes)
```

## Parameters

- `dataPath` <code>readonly (string | number)[]</code>
- `indexes` <code>readonly number[]</code>

### Explanation

`toFieldPath(['lines', '*', 'quantity'], [2])` is `['lines', 2, 'quantity']`. A path with more `'*'` than indexes is a mistake in the code, so it throws a `TypeError`. The path comes from the definition at runtime, so pass it to Formisch `as never`.

## Returns

- `path` <code>[FieldPath](/api/schema/toFieldPath#fieldpath)</code>

## FieldPath

```ts
type FieldPath = readonly (string | number)[]
```

A field's Formisch path, with real indexes: `['lines', 0, 'quantity']`.

## Related

### Guides

- [Rendering with Formisch](/frameworks/formisch#paths)

### Types

- [FieldNode](/api/schema/FieldNode)
