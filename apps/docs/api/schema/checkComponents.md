---
description: Throws a TypeError naming every field type in a tree that has no component.
---

# checkComponents

Throws a `TypeError` that names every field type of a tree, at any depth, that `components` has no entry for.

```ts
checkComponents(nodes, components)
```

## Parameters

- `nodes` <code>readonly [FieldNode](/api/schema/FieldNode)[]</code>
- `components` <code>Readonly&lt;Record&lt;string, unknown&gt;&gt;</code>

### Explanation

A renderer that takes a component per field type calls it before it renders, so a missing component shows up at once, rather than when its field first appears, like in a new list item. The adapters call it for you.

## Related

### Functions

- [checkLayoutComponents](/api/schema/checkLayoutComponents)

### Guides

- [Rendering with Formisch](/frameworks/formisch#controls)
