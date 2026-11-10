---
description: 'A form rule: the paths it reads and the check it runs on their values.'
---

# FormRuleDef

A form rule, as [`defineFormRule`](/api/schema/defineFormRule) takes it.

## Generics

- `TParams` <code>extends [AnyObjectSchema](/api/schema/FieldTypeDef#anyschema-anyaction-anyobjectschema)</code>

## Definition

- `FormRuleDef`
  - `params` <code>TParams</code>: optional, its params, next to `rule`, `field` and `message`
  - `reads` <code>(params) =&gt; readonly string[]</code>: the paths it reads besides `field`
  - `kinds` <code>readonly [ValueKind](/api/schema/ValueKind)[]</code>: optional, the kinds the fields may have. Any without it
  - `sameKind` <code>boolean</code>: optional, true when every field must have the same kind
  - `check` <code>(values: readonly unknown[], params) =&gt; boolean</code>: true when the values pass: `field`'s first, then those of `reads`
  - `meta` <code>[RuleMeta](/api/schema/RuleDef#rulemeta)</code>: optional

### Explanation

`check` runs only when none of the fields has an issue or is empty. See [custom rules](/guide/custom-rules#form-rules).

## Related

### Functions

- [defineFormRule](/api/schema/defineFormRule)
- [defaultFormRules](/api/schema/defaultFormRules)
