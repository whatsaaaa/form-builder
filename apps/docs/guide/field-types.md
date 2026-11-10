---
description: The built-in field types, what each one holds, and the props it takes.
---

# Field types

A field's `type` says what it holds and how it is checked. There is a type for every native form control, two types that hold other fields, and three display elements. Below you will learn what each one does.

## Overview

| Type                                  | Value                               | Props                   |
| ------------------------------------- | ----------------------------------- | ----------------------- |
| `text`, `textarea`, `password`, `tel` | a string                            |                         |
| `email`, `url`                        | a string, checked by its format     |                         |
| `number`                              | a number                            |                         |
| `checkbox`                            | `true` or `false`                   |                         |
| `date`, `time`, `datetime`            | an ISO string, like `"2026-10-28"`  | `output?`               |
| `select`, `radio`                     | the value of one option             | `options`, `valueType?` |
| `multiselect`                         | the values of some options          | `options`               |
| `file`                                | a `File`, or a list with `multiple` | `multiple?`, `accept?`  |
| `heading`, `paragraph`, `divider`     | none: text between fields           | `text`, `level?`        |
| `group`                               | an object with a key for each field | `fields`                |
| `array`                               | a list of values or of objects      | `of` or `fields`        |

Each type also has a kind: `string`, `number`, `boolean`, `date`, `array`, `file`, `object`, or `none` for a display element. The kind decides which rules fit the field and what counts as empty. The [built-in field types](/api/schema/field-types) reference lists every type with its kind and props.

Anything more specific is a variant of one of these, or a type of your own. A star rating is a `number` with `"ui": { "widget": "rating" }`, and a colour picker is a `text` with the `hexColor` rule. Your renderer picks the component.

## Text

`text`, `textarea`, `password` and `tel` hold a string. `email` and `url` do too, and check it with the `email` or `url` rule. A `tel` field takes any text: add a `regex` rule for the format you expect.

```json
{
  "name": "phone",
  "type": "tel",
  "label": "Phone",
  "rules": [
    {
      "rule": "regex",
      "pattern": "^\\+?[0-9 ]{6,20}$",
      "message": "Use digits and spaces"
    }
  ]
}
```

## Numbers

A `number` holds a number. An input element gives a string, like `"5"`, so renderers turn it into a number before they set it. The adapters do that for you.

```json
{
  "name": "quantity",
  "type": "number",
  "label": "Quantity",
  "default": 1,
  "rules": [{ "rule": "integer" }, { "rule": "minValue", "value": 1 }]
}
```

## Checkboxes

A `checkbox` holds `true` or `false`. A required checkbox must be ticked, like one that accepts the terms. A checkbox nobody touched holds nothing, so give it `"default": false` when you need `false` in the output.

```json
{
  "name": "acceptTerms",
  "type": "checkbox",
  "label": "I accept the terms",
  "required": { "message": "Please accept the terms" }
}
```

## Dates and times

`date`, `time` and `datetime` hold ISO strings, like `"2026-10-28"`, `"14:30"` and `"2026-10-28T14:30"`, the values of the native inputs. The rules compare them as strings.

With `"output": "date"`, a `date` or `datetime` outputs a `Date` instead, after every rule ran. Neither has a time zone, so the `Date` is in local time: a `date` is midnight of the picked day.

```json
{
  "name": "birthDate",
  "type": "date",
  "label": "Birth date",
  "output": "date",
  "rules": [
    {
      "rule": "maxValue",
      "value": "2010-12-31",
      "message": "Pick a date in 2010 or before"
    }
  ]
}
```

## Choices

A `select` or a `radio` holds the value of one of its `options`, and a `multiselect` holds a list of them. Options are `{ "value", "label" }` objects: at least one, each value different, and all values of the same type.

```json
{
  "name": "size",
  "type": "select",
  "label": "Size",
  "required": true,
  "options": [
    { "value": 1, "label": "Small" },
    { "value": 2, "label": "Medium" },
    { "value": 3, "label": "Large" }
  ]
}
```

- **The options decide the kind.** A select with number options has kind `number`: it rejects `"1"`, and takes rules like `minValue`.
- **A select without options**, because they load from an API, takes any value of its `valueType`: `"string"`, the default, or `"number"`. With options, `valueType` is ignored.
- **A required radio** accepts any option, `false` included, so a yes or no radio can be required.
- **A required multiselect** needs at least one item. Add a `minLength` rule for more, like "pick at least two". Rules for the options' kind, like `maxValue`, run on each item.
- **A checkbox group** is a `multiselect` with `"ui": { "widget": "checkboxes" }`.

## Files

A `file` holds a `File`, or a list of them with `"multiple": true`. `accept` takes MIME types separated by commas:

```json
{
  "name": "photos",
  "type": "file",
  "label": "Photos",
  "multiple": true,
  "accept": "image/png,image/jpeg",
  "rules": [
    { "rule": "maxSize", "value": 5242880, "message": "Up to 5 MB each" },
    { "rule": "maxLength", "value": 4, "message": "Up to 4 photos" }
  ]
}
```

- A `File` only knows its MIME type, so extensions like `.pdf` and wildcards like `image/*` aren't accepted.
- With `multiple`, file rules like `maxSize` check each file, and `maxLength` limits how many there are.
- The schema reads the `File` global only while it parses, so the package also loads during server rendering.

## Display elements

`heading`, `paragraph` and `divider` show text and lines between fields. They have no value, so they need no `name`, and take no `default`, `required` or `rules`.

```json
{ "type": "heading", "text": "Delivery", "level": 3 }
```

A `heading` takes `text` and a `level` from 1 to 6, which defaults to 2. A `paragraph` takes `text`, as plain text: whether it renders markdown is up to your renderer. Their `text` can be an i18n key that your renderer translates.

## Groups

A `group` holds other fields, and its value is an object with a key for each of them:

```json
{
  "name": "address",
  "type": "group",
  "label": "Address",
  "fields": [
    { "name": "city", "type": "text", "required": true },
    { "name": "zip", "type": "text" }
  ]
}
```

The value is `{ address: { city, zip } }`, and Formisch's path to the city is `['address', 'city']`. A group is always there, and its fields decide what is required, so it takes no `required` or `default`. A name only has to be unique among the fields next to it.

## Lists

An `array` holds a list. With `of`, it is a list of single values, like tags, and `of` is the field each item uses, without a `name`. With `fields`, it is a list of objects, like the lines of an order:

```json
{
  "name": "lines",
  "type": "array",
  "label": "Order lines",
  "required": { "message": "Add at least one product" },
  "rules": [{ "rule": "maxLength", "value": 10 }],
  "fields": [
    { "name": "product", "type": "text", "required": true },
    { "name": "quantity", "type": "number", "default": 1 }
  ]
}
```

- Rules on a list, like `minLength` and `maxLength`, count its items, and a required list needs at least one.
- A new item starts with the defaults of its fields. The adapters' `add()` gives it to Formisch for you.
- Form rules, layouts and conditions name the field of an item with `*`: `lines.*.quantity`.

Display elements can go inside groups and lists too.

## Next steps

Now that you know the field types, continue to [validation rules](/guide/rules) to learn how to check their values.
