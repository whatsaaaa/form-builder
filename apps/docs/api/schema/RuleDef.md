---
description: 'A rule: the kinds it fits, its params, its stage and the action it creates.'
---

# RuleDef

A rule, as [`defineRule`](/api/schema/defineRule) takes it.

## Generics

- `TParams` <code>extends [AnyObjectSchema](/api/schema/FieldTypeDef#anyschema-anyaction-anyobjectschema)</code>

## Definition

- `RuleDef`
  - `kinds` <code>readonly [ValueKind](/api/schema/ValueKind)[]</code>: the kinds of field it fits
  - `stage` <code>[RuleStage](/api/schema/RuleDef#rulestage)</code>: optional, `'normalize'` or `'validate'`, the default
  - `params` <code>TParams | ((kind: [ValueKind](/api/schema/ValueKind)) =&gt; TParams)</code>: optional, the params it takes
  - `meta` <code>[RuleMeta](/api/schema/RuleDef#rulemeta)</code>: optional
  - `create` <code>(params, message?: string) =&gt; [AnyAction](/api/schema/FieldTypeDef#anyschema-anyaction-anyobjectschema)</code>: the Valibot action for its params and message

### Explanation

See [custom rules](/guide/custom-rules).

## RuleMeta

- `RuleMeta`
  - `label` `string`
  - `description` `string`: optional
  - `category` `RuleCategory`

## RuleCategory

```ts
type RuleCategory =
  | 'length'
  | 'text'
  | 'content'
  | 'format'
  | 'date'
  | 'comparison'
  | 'number'
  | 'file'
  | 'normalize'
  | (string & {})
```

## RuleStage

```ts
type RuleStage = 'normalize' | 'validate'
```

`normalize` rules run before the required check, so `'   '` with `trim` counts as empty. `validate` rules run after it.

## Related

### Functions

- [defineRule](/api/schema/defineRule)
- [defaultRules](/api/schema/defaultRules)
