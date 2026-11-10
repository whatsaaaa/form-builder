---
description: Register rules and form rules of your own, for checks that need code, like Valibot's check action.
---

# Custom rules

Some checks need code, like Valibot's `check` and `transform` actions, which take a function. Below you will learn how to register them as rules and form rules, so definitions can name them like the built-in ones.

## Rules

`defineRule()` defines a rule: the kinds of field it fits, and `create`, which returns the Valibot action for its params and message. Register it with `createSchemaBuilder()`:

<<< @/snippets/schema/custom-rules.ts#rule

A definition can now use it:

<!-- docs: fragment -->

```json
{
  "name": "seats",
  "type": "number",
  "rules": [{ "rule": "even", "message": "An even number" }]
}
```

Your rules merge over the built-in ones by name, so a rule named `email` replaces the built-in one.

## Params

`params` is a Valibot object schema of the keys the rule takes next to `rule` and `message`. Unknown keys are issues. It can also be a function of the field's kind, for params whose type depends on it:

<<< @/snippets/schema/custom-rules.ts#params

## Normalize rules

A rule with `stage: "normalize"` runs before the required check, like `trim`, and its action changes the value:

<<< @/snippets/schema/custom-rules.ts#normalize

## Form rules

`defineFormRule()` defines a form rule. It lists the paths it reads besides `field`, and checks their values with a plain function:

<<< @/snippets/schema/custom-rules.ts#form-rule

<!-- docs: fragment -->

```json
{
  "rule": "sameZip",
  "field": "shippingZip",
  "others": ["billingZip"],
  "message": "Use the same ZIP as for billing"
}
```

- `reads(params)` gives the paths the rule reads, so the builder checks that those fields exist.
- `kinds` are the kinds those fields may have, and `sameKind: true` makes them all have the same one.
- `check(values, params)` gets the value of `field` first, then the values of the paths from `reads`. It runs only when none of them has an error of its own or is empty. The errors of other form rules don't count, so the order of `formRules` never matters.

## Meta

`meta` describes a rule to people, with a `label`, a `category` and an optional `description`. A rule picker groups by category, and the JSON Schema shows the label and the description in your editor. Use a built-in category, like `comparison`, or one of your own.

## Reserved keys

`rule` and `message` are a rule's own keys, and `rule`, `field` and `message` a form rule's, so params can't use them. Mistakes like these throw a `TypeError` from `createSchemaBuilder()`. See [reserved keys](/api/schema/reserved-keys).
