---
description: 'A form definition: its version, fields, form rules and layout.'
---

# JsonForm

A form definition.

## Definition

- `JsonForm`
  - `version` <code>'1'</code>: the version of the format
  - `fields` <code>readonly [JsonField](/api/schema/JsonField)[]</code>
  - `formRules` <code>readonly [JsonFormRule](/api/schema/JsonFormRule)[]</code>: optional, rules that compare fields
  - `layout` <code>[JsonLayout](/api/schema/JsonLayout)</code>: optional, where the fields go
  - `$schema` <code>string</code>: optional, where its JSON Schema is, for editors. Never read

### Explanation

See [define your form](/guide/define-your-form). A definition from outside your code isn't known to be a `JsonForm` until [`validate()`](/api/schema/SchemaBuilder#validate) says so.

## Related

### Types

- [JsonField](/api/schema/JsonField)
- [JsonFormRule](/api/schema/JsonFormRule)
- [JsonLayout](/api/schema/JsonLayout)
- [TypedForm](/api/schema/TypedForm)
