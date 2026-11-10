---
description: One field of a definition as a renderer sees it, with its role, kinds and paths.
---

# FieldNode

One field of a definition, with the fields inside it, as the builder's `getFieldTree()` and `getLayout()` give it.

## Definition

- `FieldNode`
  - `field` <code>[JsonField](/api/schema/JsonField)</code>: the field as the definition has it
  - `type` <code>string</code>: its field type, like `'text'`
  - `role` <code>[FieldRole](/api/schema/FieldNode#fieldrole)</code>: how a renderer shows it
  - `kind` <code>[ValueKind](/api/schema/ValueKind)</code>: the kind of its value, or `'none'` for a display element
  - `itemKind` <code>[ValueKind](/api/schema/ValueKind) | undefined</code>: the kind of the items, for kind `array`
  - `dataPath` <code>readonly (string | number)[]</code>: where the value is, with `'*'` for each list index
  - `definitionPath` <code>[DefinitionPath](/api/schema/DefinitionIssue#definitionpath)</code>: where the field is in the definition. Unique
  - `children` <code>readonly [FieldNode](/api/schema/FieldNode)[]</code>: the fields of a group, or of one item of a list

## FieldRole

```ts
type FieldRole = 'value' | 'group' | 'array' | 'display'
```

A `value` field has an input, a `group` or an `array` holds fields, and a `display` element, like a heading, has no value.

## Related

### Guides

- [Rendering with Formisch](/frameworks/formisch#rendering-by-role)

### Types

- [FormLayout](/api/schema/FormLayout)
