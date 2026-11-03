---
'@whatsaaaa/form-builder-schema': minor
---

Form rules: check a field against other fields, such as a repeated password or a date range. Definitions without `formRules` build exactly as in 0.5.

```json
{
  "formRules": [
    { "rule": "sameAs", "field": "password2", "other": "password", "message": "Passwords differ" }
  ]
}
```

**New in the definition:** `formRules`, next to `fields`. Each one names the `field` its error shows on, as a dot path: `'password2'`, `'address.zip'`, or `'lines.*.qty'` to run once per item of an array. `message` is required.

- **Built-in form rules:** `sameAs`, `differentFrom` and `compare` (`op`: `lt`, `lte`, `gt` or `gte`).
- A form rule runs after every field's own rules, and only when the fields it reads have no issues and aren't empty. So a password that is too short never also shows "Passwords differ".
- New issue code `unknown_field`, for a path that names no field with a value. `unknown_rule`, `unknown_param`, `invalid_params` and `kind_mismatch` are reused, on paths like `formRules[0]`.

**For your own form rules:** `defineFormRule({ params, reads, kinds, sameKind, check, meta })`, registered with `createSchemaBuilder({ formRules })`. `check` gets the values as a plain array, and `reads` lists the paths it needs besides `field`. `defaultFormRules` and `RESERVED_FORM_RULE_KEYS` are exported, and the builder returns its `formRules`.

**`includeDefaultRules: false`** now leaves out the built-in form rules too. Add them back with `formRules: defaultFormRules`.
