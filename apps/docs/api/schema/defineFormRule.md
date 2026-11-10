---
description: Defines a form rule of your own, which checks a field against others.
---

# defineFormRule

Defines a form rule. It returns the form rule unchanged, typed so that `reads()` and `check()` get its params parsed.

```ts
const formRule = defineFormRule<TParams>(def)
```

## Generics

- `TParams` <code>extends [AnyObjectSchema](/api/schema/FieldTypeDef#anyschema-anyaction-anyobjectschema)</code>

## Parameters

- `def` <code>[FormRuleDef](/api/schema/FormRuleDef)&lt;TParams&gt;</code>

### Explanation

Register the form rule with [`createSchemaBuilder`](/api/schema/createSchemaBuilder)'s `formRules` option, under the name definitions use in `rule`.

## Returns

- `formRule` <code>[FormRuleDef](/api/schema/FormRuleDef)&lt;TParams&gt;</code>

## Example

<<< @/snippets/schema/custom-rules.ts#form-rule

## Related

### Guides

- [Custom rules](/guide/custom-rules#form-rules)

### Types

- [FormRuleDef](/api/schema/FormRuleDef)
