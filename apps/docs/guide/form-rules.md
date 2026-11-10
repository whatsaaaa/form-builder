---
description: Check a field against other fields, like a repeated password or a date range, with form rules.
---

# Form rules

A form rule checks a field against other fields, like a repeated password, or an end date after the start. Below you will learn how to write form rules, and when they run.

## Adding form rules

Form rules go in `formRules`, next to `fields`. Each one names the `field` its error shows on, the fields it compares with, and a `message`:

```json
{
  "version": "1",
  "fields": [
    { "name": "password", "type": "password", "required": true },
    { "name": "confirmPassword", "type": "password", "required": true },
    { "name": "start", "type": "date" },
    { "name": "end", "type": "date" }
  ],
  "formRules": [
    {
      "rule": "sameAs",
      "field": "confirmPassword",
      "other": "password",
      "message": "Passwords differ"
    },
    {
      "rule": "compare",
      "field": "end",
      "op": "gt",
      "other": "start",
      "message": "After the start"
    }
  ]
}
```

There are three built-in form rules:

| Rule            | Params                                     | Kinds                         | Passes when       |
| --------------- | ------------------------------------------ | ----------------------------- | ----------------- |
| `sameAs`        | `other`                                    | string, number, boolean, date | `field === other` |
| `differentFrom` | `other`                                    | string, number, boolean, date | `field !== other` |
| `compare`       | `op` (`lt`, `lte`, `gt` or `gte`), `other` | number, date                  | `field op other`  |

The `message` is required. Without it, the error would be Valibot's generic "Invalid input", which says nothing about the other field.

## Paths

A form rule names fields by their dot path: `password`, `address.zip` for a field in a group, and `lines.*.quantity` for a field in the items of a list.

A rule whose `field` has `*` runs once for each item, and its error shows on that item's field. A path it compares with that has `*` means the same item, so this rule compares each line with itself:

```json
{
  "version": "1",
  "fields": [
    {
      "name": "lines",
      "type": "array",
      "fields": [
        { "name": "quantity", "type": "number", "required": true },
        { "name": "stock", "type": "number", "required": true }
      ]
    }
  ],
  "formRules": [
    {
      "rule": "compare",
      "field": "lines.*.quantity",
      "op": "lte",
      "other": "lines.*.stock",
      "message": "Not enough in stock"
    }
  ]
}
```

## When they run

- **Form rules run last**, after every field's own rules, and only when the fields they read have no errors. A password that is too short never also shows "Passwords differ".
- **Their order doesn't matter.** Each form rule looks only at the errors of the fields, never at those of the other form rules, so it reports the same wherever it is in `formRules`.
- **They never run on an empty value.** Make the fields required when they must be filled.
- **The fields must have the same kind.** `compare` on a number and a date is an issue. A date with `"output": "date"` is compared by its time, also with a date field that holds an ISO string.

Formisch shows a form rule's error on the field it names, and on that field of each list item, with nothing to wire up.

## In the schema

With form rules, the schema is the object schema of the fields in a `v.pipe()`, with one check that runs every form rule. A new object made from `schema.entries`, as with `v.pick()`, `v.omit()` or `v.object({ ...schema.entries })`, leaves the form rules out. Pipe it with the check from `schema.pipe` when you need them.

## Your own form rules

Form rules of your own check their values with a plain function, like "all these ZIP codes are the same". See [custom rules](/guide/custom-rules#form-rules).

## Next steps

Now that you can check the values, continue to [layout](/guide/layout) to put the fields in sections, rows and steps.
