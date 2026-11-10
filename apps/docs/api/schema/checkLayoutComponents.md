---
description: Throws a TypeError naming every layout type without a component, and every slot without content.
---

# checkLayoutComponents

Throws a `TypeError` that names every layout type the layout uses that `components` has no entry for, like `section` or `row`, and every slot that `slots` has no content for.

```ts
checkLayoutComponents(layout, components, slots)
```

## Parameters

- `layout` <code>[FormLayout](/api/schema/FormLayout)</code>
- `components` <code>object</code>
- `slots` <code>object</code>

### Explanation

It checks every step, so a missing component shows up before the first render, not on the step that uses it. A layout without sections, rows and slots needs none. The adapters call it for you.

## Related

### Functions

- [checkComponents](/api/schema/checkComponents)

### Guides

- [Layout components](/frameworks/layout-components)
