---
description: One field of a form definition, with the keys every field takes and its type's props.
---

# JsonField

One field of a definition.

## Definition

- `JsonField`
  - `name` <code>string</code>: its key in the value. Every field with a value has one
  - `type` <code>string</code>: its field type
  - `label` <code>string</code>: optional
  - `description` <code>string</code>: optional
  - `placeholder` <code>string</code>: optional
  - `default` <code>unknown</code>: optional, its starting value
  - `required` <code>boolean | { message?: string }</code>: optional
  - `rules` <code>readonly [JsonRule](/api/schema/JsonRule)[]</code>: optional
  - `ui` <code>Record&lt;string, unknown&gt;</code>: optional, for renderers. Never read or checked
  - `[prop: string]` <code>unknown</code>: the props of its type, like `options`

### Explanation

These keys are the `RESERVED_FIELD_KEYS`: a field type's props can't use them. See [define your form](/guide/define-your-form#fields).

## Related

### Types

- [JsonForm](/api/schema/JsonForm)
- [JsonRule](/api/schema/JsonRule)

### Constants

- [Reserved keys](/api/schema/reserved-keys)
