---
'@whatsaaaa/form-builder-schema': minor
---

Two more render helpers, which the Vue and React adapters share:

- `selectFields(fields, { only, except })` gives the field tree without the fields `except` names, at any depth, with `'*'` for an array's items: `except: ['lines.*.note']`. With `only`, it gives just the fields `only` names, in the order of the definition. A path that names no field throws a `TypeError`.
- `checkComponents(nodes, components)` throws a `TypeError` that names every field type in the tree without a component, for a renderer that takes a component per type.

```ts
const nodes = selectFields(builder.getFieldTree(json), { except: ['coupon'] })
checkComponents(nodes, components) // No component for the field type "money". Add it to the components.
```
