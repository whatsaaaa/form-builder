---
'@whatsaaaa/form-builder-schema': minor
---

Bug fixes from a code quality review, and stricter checks for definitions that built a broken schema.

**Stricter validation.** `validate()` and `build()` now report these, so a definition that 0.9.0 accepted can fail:

- An unknown key on the definition itself is `unknown_key`, like on a field. A misspelled `formrules` used to be ignored, so its form rules never ran. A definition takes `version`, `fields`, `formRules` and `$schema`.
- A `default` on a display element (`heading`, `paragraph`, `divider`) is `invalid_shape`, like `rules` and `required`. Both `getInitialInput` functions now leave display elements out.
- The names `*` and `__proto__` are `invalid_name`. Form rule paths read the items of a list with `*`, so a rule on a field named `*` never ran, and a field named `__proto__` built a schema that rejected every value.
- An array's `of` that is no field, like `null`, is `invalid_shape`. It used to build a list of empty objects.
- Unknown keys named `constructor`, `prototype` or `__proto__` on a field, rule or form rule are reported like any other unknown key.
- `ui` must be an object. An array was accepted.

**Fixes.**

- `sameAs`, `differentFrom` and `compare` compare a date with `output: 'date'` and a date without it by their time. They used to compare the `Date` with the ISO string, so equal dates differed.
- `validate()` no longer adds a second, misleading issue: `invalid_default` on an array whose item field has issues, or `kind_mismatch` for a multiselect's rules while its options have issues.
- `resolveMessage` is called with the required message for required fields only.

The code behind `validate()` is split into smaller functions, code that was written twice is shared, and the tests cover every line. The `isoTimestamp` rule's description shows the usual uppercase `Z`: `2026-10-28T14:30:15.000Z`.
