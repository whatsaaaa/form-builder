---
description: Every built-in rule, by name, and the rule families it is made of.
---

# defaultRules

Every built-in rule, by name. It is made of nine families, each exported on its own: `lengthRules`, `textRules`, `contentRules`, `formatRules`, `dateRules`, `comparisonRules`, `numberRules`, `fileRules` and `normalizeRules`.

```ts
const rules = defaultRules
```

## Explanation

Every builder has them, unless `includeDefaultRules` is `false`. Register single families to offer fewer rules, as shown in [registering only some rules](/guide/rules#registering-only-some-rules). The [built-in rules](/api/schema/rules) reference lists each rule with its kinds and params.

## Example

<<< @/snippets/schema/rules.ts#some

## Related

### Guides

- [Validation rules](/guide/rules)

### Types

- [RuleDef](/api/schema/RuleDef)
