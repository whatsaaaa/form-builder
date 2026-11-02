---
'@whatsaaaa/form-builder-schema': minor
---

The field types catalog: a built-in type for every native control, plus three display elements.

**New value types:** `textarea`, `url`, `tel`, `checkbox`, `date`, `time`, `datetime`, `select`, `radio`, `multiselect` and `file`, next to `text`, `email`, `password` and `number`.

```json
{
  "name": "size",
  "type": "select",
  "options": [
    { "value": 1, "label": "Small" },
    { "value": 2, "label": "Large" }
  ]
}
```

- `select`, `radio` and `multiselect` take `options` as `{ value, label }[]`. The options' value type sets the kind, so a select with number options rejects `'1'`. A `select` without options takes any value of its `valueType`.
- `date` and `datetime` output ISO strings. With `output: 'date'` they output a `Date`, converted after every rule.
- `file` takes `multiple` and `accept` (MIME types). With `multiple`, `maxSize` checks each file and `maxLength` the count.
- A checkbox group is a `multiselect` with `ui: { widget: 'checkboxes' }`.

**New display elements:** `heading` (`text`, `level`), `paragraph` (`text`) and `divider`. They need no name and add no output key.

**For your own field types,** all optional:

- `kind` can be a function of the field, for a kind that depends on its props.
- `itemKind` names the kind of each item of an array value. Rules for that kind run on each item and report on the field.
- `required(message)` replaces the kind's required check, and `finalize(field)` adds an action that runs after every rule.

If you registered your own `select`, `checkbox`, `date` or other type with a name that is now built in, yours still wins.
