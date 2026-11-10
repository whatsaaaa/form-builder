---
description: Defines a rule of your own, from a Valibot action.
---

# defineRule

Defines a rule. It returns the rule unchanged, typed so that `create()` gets its params parsed.

```ts
const rule = defineRule<TParams>(def)
```

## Generics

- `TParams` <code>extends [AnyObjectSchema](/api/schema/FieldTypeDef#anyschema-anyaction-anyobjectschema)</code>

## Parameters

- `def` <code>[RuleDef](/api/schema/RuleDef)&lt;TParams&gt;</code>

### Explanation

Register the rule with [`createSchemaBuilder`](/api/schema/createSchemaBuilder)'s `rules` option, under the name definitions use in `rule`.

## Returns

- `rule` <code>[RuleDef](/api/schema/RuleDef)&lt;TParams&gt;</code>

## Example

<<< @/snippets/schema/custom-rules.ts#rule

## Related

### Guides

- [Custom rules](/guide/custom-rules)

### Types

- [RuleDef](/api/schema/RuleDef)
