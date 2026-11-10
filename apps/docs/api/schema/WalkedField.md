---
description: One field as the builder's walkFields gives it, with its paths, depth and kind.
---

# WalkedField

One field, as the builder's [`walkFields`](/api/schema/SchemaBuilder#walkfields) gives it.

## Definition

- `WalkedField`
  - `field` <code>[JsonField](/api/schema/JsonField)</code>
  - `type` <code>string</code>
  - `dataPath` <code>readonly (string | number)[]</code>: where the value is, with `'*'` for each list index
  - `definitionPath` <code>[DefinitionPath](/api/schema/DefinitionIssue#definitionpath)</code>: where the field is in the definition
  - `depth` <code>number</code>: 0 for the form's own fields, 1 for the fields inside them, and so on
  - `kind` <code>[ValueKind](/api/schema/ValueKind)</code>: optional, left out for a field with issues
  - `itemKind` <code>[ValueKind](/api/schema/ValueKind)</code>: optional, the kind of the items, for kind `array`

## Related

### Functions

- [SchemaBuilder.walkFields](/api/schema/SchemaBuilder#walkfields)
