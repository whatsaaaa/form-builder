---
description: The keys this package owns on fields, rules and form rules, which props and params can't use.
---

# Reserved keys

The keys the package owns. A field type's props, a rule's params and a form rule's params can't use them, and `createSchemaBuilder()` throws a `TypeError` when one does.

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
] as const

const RESERVED_RULE_KEYS = ['rule', 'message'] as const

const RESERVED_FORM_RULE_KEYS = ['rule', 'field', 'message'] as const
```

## Explanation

- `RESERVED_FIELD_KEYS` are the keys every field takes. See [`JsonField`](/api/schema/JsonField).
- `RESERVED_RULE_KEYS` are the keys every rule takes, next to its params.
- `RESERVED_FORM_RULE_KEYS` are the keys every form rule takes, next to its params.

An extension's keys can't use the reserved field keys either, nor the props of a field type, nor another extension's keys.
