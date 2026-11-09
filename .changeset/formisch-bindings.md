---
'@whatsaaaa/form-builder-schema': minor
---

Formisch for Qwik accepts built schemas, Formisch's `field.props` reads multiselects, checkbox groups and multiple files, and a `date` with `output: 'date'` is the day the person picked in every time zone.

**Changed output.** A `date` field with `output: 'date'` now gives local midnight of the picked day, the same way a `datetime` gives local time. It used to give UTC midnight, which is the day before west of UTC: `2000-01-15` came out as January 14 in New York. `sameAs`, `differentFrom` and `compare` read a date that holds the ISO string the same way, so they still compare it by its day with one that holds a `Date`. Code that reads the `Date` with UTC getters, like `getUTCDate()` or `toISOString()`, sees the change.

**Fixes.**

- `@formisch/qwik` accepts built schemas. It rejected every definition with a value field: `"lazy" schema is not supported`. A field's schema no longer wraps `v.lazy`, and checks for an empty value inside it instead.
- Formisch makes an array field for a multiselect, a checkbox group and a file field with `multiple`, so `field.props` reads every choice and file from the elements. It used to read one value, so in every binding but Vue, whose `field.props` only validate, these forms reported `Invalid type: Expected Array but received true` and could never be submitted.
- `build()` is typed as the new `JsonFormSchema`: the object schema of the fields, in a pipe with one check per form rule when the definition has form rules. It was typed as an object schema alone, so a new object from `schema.entries` left the form rules out without a type error. The form rules are now all in one pipe after the object schema.

A field's schema still starts without a value in Formisch, reports the same messages, and gives `undefined` for an empty optional field.
