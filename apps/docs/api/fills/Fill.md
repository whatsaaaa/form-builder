---
description: 'The fill of a field: the fields its values set, from a source of yours or a map in the definition.'
---

# Fill

The `fills` of a field, its trigger: each new value of the trigger sets other fields. With `source`, the values come from a [source](/api/fills/FillSource) registered with [`fills({ sources })`](/api/fills/fills), for the fields `fields` lists. With `map`, they are written in the definition, for each value of the trigger.

```ts
type Fill<TSource extends string = string> =
  | {
      source: TSource
      fields: readonly string[]
      overwrite?: FillOverwrite
    }
  | {
      map: Readonly<Record<string, Readonly<Record<string, FillMapValue>>>>
      overwrite?: FillOverwrite
    }
```

## Explanation

- **`source`** is the name of a source. **`fields`** lists the fields it sets, at least one, each once. Only these are taken from what the source gives.
- **`map`** has an entry for each value of the trigger, written as JSON writes it: the value itself for a string or a date, `"1"` for the number 1, and `"true"` or `"false"` for a checkbox. Each entry gives fields their values. The fill sets every field its entries name: a field an entry leaves out, or gives `null`, is set blank, and so is every field for a value with no entry.
- **Clearing the trigger** blanks every field the fill sets, edited or not, while the form is open.
- **Fields** are named by their dot path from the root, like `firstName`, or `address.city` for a field of a group. A fill can't set a group or a list as a whole, a file, or a field inside a list's items.
- **The trigger** is a field with a string, number, boolean or date value, outside a list's items, like a select, a radio, a checkbox, a text or a date field.
- **The keys of a map** must be values the trigger can hold, like the value of one of a select's options.
- **The values of a map** must be values their field can hold, rules included, like a `default`. A blank one, `null` or `""`, always fits.

What a running fill does, like when it fires and which fields it leaves alone, is in [fills](/guide/extensions#fills).

## FillOverwrite

```ts
type FillOverwrite = 'unedited' | 'always'
```

Which fields a fill sets. With `'unedited'`, the default, it sets only the fields the user hasn't changed since the last fill, and those that are empty. With `'always'`, it sets every field.

## FillMapValue

```ts
type FillMapValue =
  string | number | boolean | null | readonly (string | number | boolean)[]
```

A value a map gives a field: one value, a list of them for a multiselect, or `null` for blank.

## Example

```json
{
  "version": "1",
  "fields": [
    {
      "name": "profile",
      "type": "select",
      "label": "Profile",
      "options": [
        { "value": "a", "label": "Profile A" },
        { "value": "b", "label": "Profile B" }
      ],
      "fills": {
        "map": {
          "a": { "firstName": "Marko", "lastName": "Petrović" },
          "b": { "firstName": "Jelena", "lastName": "Jovanović" }
        },
        "overwrite": "always"
      }
    },
    { "name": "firstName", "type": "text", "label": "First name" },
    { "name": "lastName", "type": "text", "label": "Last name" }
  ]
}
```

## Related

### Types

- [FillSource](/api/fills/FillSource)
- [FillsExtension](/api/fills/FillsExtension)
