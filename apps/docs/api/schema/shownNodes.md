---
description: The layout nodes to render when some fields are hidden.
---

# shownNodes

Gives the layout nodes to render when some fields are hidden, by a function that says whether a field is shown.

```ts
const nodes = shownNodes(nodes, indexes, isShown)
```

## Parameters

- `nodes` <code>readonly [LayoutNode](/api/schema/FormLayout#layoutnode)[]</code>
- `indexes` <code>readonly number[]</code>: of the list items the nodes are in, outermost first
- `isShown` <code>(node: [FieldNode](/api/schema/FieldNode), indexes: readonly number[]) =&gt; boolean</code>

### Explanation

- A hidden field drops out, with every field inside it.
- A group, a section or a row whose fields are all hidden drops out too, even when it holds text. One with no field with a value at all, only text, stays.
- A row's other cells keep their spans and line up from its first column: a row is one line, so no field moves to another.
- A list's items aren't looked into: call it for each item, with its indexes.

For the conditions of extensions, use the visibility state's [`shownNodes`](/api/schema/Visibility#visibilitystate), which also leaves out what the conditions hide.

## Returns

- `nodes` <code>[LayoutNode](/api/schema/FormLayout#layoutnode)[]</code>

## Related

### Types

- [Visibility](/api/schema/Visibility)

### Functions

- [selectFields](/api/schema/selectFields)
