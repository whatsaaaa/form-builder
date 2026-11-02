---
'@whatsaaaa/form-builder-schema': minor
---

---

'@whatsaaaa/form-builder-schema': minor
---

The Valibot rule catalog: every Valibot action whose arguments fit in JSON is now a rule with the same name, 80 in all.

**Rules come in families** you can register on their own: `lengthRules`, `textUnitRules`, `contentRules`, `formatRules`, `dateRules`, `comparisonRules`, `numberRules`, `fileRules` and `normalizeRules`. `defaultRules` spreads all of them.

```ts
const { build } = createSchemaBuilder({
  includeDefaultRules: false,
  rules: { ...formatRules, ...lengthRules },
})
```

**Rules describe themselves.** Every built-in rule has `meta` with a `label` and a `category`, and `rulesForKind(kind)` lists the rules that fit a kind, for the builder app's rule picker.

**`params` can depend on the kind.** `minValue` takes a number on a number field and an ISO string on a date field. Consumer rules can do the same with `params: (kind) => v.object(…)`.

**Changes to existing rules:**

- `minLength` and `maxLength` also work on array fields, and `minValue` and `maxValue` on date fields.
- `regex` checks its `pattern` and `flags` together: a pattern `RegExp` rejects is an `invalid_params` issue instead of an error from `build()`. The `g` and `y` flags are ignored.
- A rule used on a kind it doesn't support reports only `kind_mismatch`. Its params are no longer checked, because they can depend on the kind.

**Valibot 1.3 or later is required**
