---
description: The keys and layout node types this package owns, which field types, rules, form rules and extensions can't use.
---

# Reserved keys

The keys and layout node types the package owns: those it reads, and some it keeps for later versions. A field type's props, a rule's params, a form rule's params and an extension's keys can't use them, and `createSchemaBuilder()` throws a `TypeError` when one does.

```ts
const RESERVED_FIELD_KEYS = [
  'name',
  'type',
  'label',
  'description',
  'placeholder',
  'default',
  'required',
  'rules',
  'ui',
  // Kept for later versions:
  'id',
  'disabled',
  'readonly',
  'hidden',
  'help',
  'meta',
] as const

const RESERVED_LAYOUT_TYPES = [
  'section',
  'row',
  'slot',
  // Kept for later versions:
  'tabs',
  'tab',
  'columns',
  'column',
  'fieldset',
] as const

const RESERVED_LAYOUT_KEYS = [
  'type',
  'id',
  'label',
  'description',
  'items',
  'ui',
  'span',
  'field',
  'name',
] as const

const RESERVED_RULE_KEYS = ['rule', 'message'] as const

const RESERVED_FORM_RULE_KEYS = ['rule', 'field', 'message'] as const
```

## Explanation

- `RESERVED_FIELD_KEYS` are the keys every field takes, and those kept for later versions. A field can't have a kept key yet: `validate()` reports it as `unknown_key`. See [`JsonField`](/api/schema/JsonField).
- `RESERVED_LAYOUT_TYPES` are the types of the layout's own nodes, and those kept for later versions. A display element's type can't have one of these names, so one written in a layout never takes the place of a layout node. A field type with a value can, as it is never written in a layout by its type. A layout node with a kept type is `unknown_type`.
- `RESERVED_LAYOUT_KEYS` are the keys of the layout's steps, sections, rows, slots and placed fields. An extension's layout props can't use them.
- `RESERVED_RULE_KEYS` are the keys every rule takes, next to its params.
- `RESERVED_FORM_RULE_KEYS` are the keys every form rule takes, next to its params.

An extension's keys can't use the reserved field keys either, nor the props of a field type, nor another extension's keys.

## Stability

These lists only grow in a major version. A name added in a minor would break every app whose own field type, params or extension already uses it, so the kept names are reserved now, and a minor version can give one of them a meaning without breaking anyone.
