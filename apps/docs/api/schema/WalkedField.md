---
description: One field as walkFields gives it, with its paths and depth.
---

# WalkedField

One field, as [`walkFields`](/api/schema/walkFields) gives it.

## Definition

- `WalkedField`
  - `field` <code>[JsonField](/api/schema/JsonField)</code>
  - `type` <code>string</code>
  - `dataPath` <code>readonly (string | number)[]</code>: where the value is, with `'*'` for each list index
  - `definitionPath` <code>[DefinitionPath](/api/schema/DefinitionIssue#definitionpath)</code>: where the field is in the definition
  - `depth` <code>number</code>: 0 for the form's own fields, 1 for the fields inside them, and so on
  - `kind` <code>[ValueKind](/api/schema/ValueKind)</code>: optional, only from the builder's `walkFields`
  - `itemKind` <code>[ValueKind](/api/schema/ValueKind)</code>: optional, the kind of the items, for kind `array`

## Related

### Functions

- [walkFields](/api/schema/walkFields)
