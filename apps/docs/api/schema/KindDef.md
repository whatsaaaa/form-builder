---
description: 'A kind: what counts as empty for a value, and its required check.'
---

# KindDef

A kind of value, like `string` or `number`.

## Definition

- `KindDef`
  - `isEmpty` <code>(input: unknown) =&gt; boolean</code>: true when the input means no value
  - `required` <code>(message: string) =&gt; [AnyAction](/api/schema/FieldTypeDef#anyschema-anyaction-anyobjectschema) | null</code>: optional, an extra check for required fields, after the normalize rules

### Explanation

Register kinds of your own with [`createSchemaBuilder`](/api/schema/createSchemaBuilder)'s `kinds` option. A field type names its kind, so rules for that kind fit it.

## Related

### Constants

- [defaultKinds](/api/schema/defaultKinds)

### Types

- [ValueKind](/api/schema/ValueKind)
