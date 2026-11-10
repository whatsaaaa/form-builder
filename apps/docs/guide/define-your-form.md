---
description: The keys of a form definition and of each field, and what the schema built from it outputs.
---

# Define your form

Every form starts with a definition: a JSON object that lists the form's fields, the rules their values must pass, and optionally where they go on the page. Below you will learn the keys of a definition and of each field.

## The definition

A definition takes these keys:

- `version`: the version of the format. It is always `"1"` for now.
- `fields`: the fields of the form, in order.
- `formRules`: rules that check a field against other fields, like a repeated password. See [form rules](/guide/form-rules).
- `layout`: where the fields go, in sections, rows and steps. Without it, the fields render in their order. See [layout](/guide/layout).
- `$schema`: where the definition's JSON Schema is, so your editor can suggest keys. It is never read. See [JSON Schema](/guide/json-schema).

Any other key is a mistake, and [`validate()`](/guide/checking-definitions) reports it.

## Fields

Every field has a `type`, and every field with a value has a `name`:

```json
{
  "name": "email",
  "type": "email",
  "label": "Email",
  "description": "We never share it.",
  "placeholder": "jane@example.com",
  "required": { "message": "Please enter your email" },
  "rules": [{ "rule": "maxLength", "value": 120 }],
  "ui": { "autocomplete": "email" }
}
```

- `name`: the field's key in the form's value. It is unique among the fields next to it, and can't hold `.`, `[`, `]` or `*`, which paths use.
- `type`: what the field holds, like `text`, `number`, `select` or `group`. See [field types](/guide/field-types).
- `label`, `description` and `placeholder`: text for people. The schema carries the label and the description as metadata, and your components show them.
- `default`: the value the field starts with. It must pass the field's own rules.
- `required`: `true`, or `{ "message": "..." }` for a message of your own.
- `rules`: the checks the value must pass, in order. See [validation rules](/guide/rules).
- `ui`: anything for your renderer, like a widget name or a CSS class. It is never read or checked.

Some types take more keys, called props. A `select` takes `options`, a `heading` takes `text`, and a `group` takes `fields`. Each type's props are listed in the [built-in field types](/api/schema/field-types).

## Required fields

A field that isn't required may stay empty. What counts as empty depends on the field's kind: `undefined` for any field, `''` for text and dates, and `[]` for a multiselect. A required field reports one message when it is empty, and nothing else:

- An empty field that isn't required outputs `undefined`, and its rules don't run.
- A required field that is empty reports only the required message, never the messages of its rules.
- A required checkbox must be ticked. A required list or multiselect needs at least one item.
- A group or a list is never empty: a missing list is read as `[]`, so its own rules, like `maxLength`, still run.

The required message is `"Required"`, unless the field has its own, or you set another for every field with the builder's `messages` option. See [messages and i18n](/guide/messages).

## The value

The definition's fields alone decide the shape of the value. A field adds its `name` as a key, a [group](/guide/field-types#groups) adds an object, and a [list](/guide/field-types#lists) adds an array:

```json
{
  "version": "1",
  "fields": [
    { "name": "name", "type": "text", "required": true },
    {
      "name": "address",
      "type": "group",
      "fields": [
        { "name": "city", "type": "text" },
        { "name": "zip", "type": "text" }
      ]
    }
  ]
}
```

This definition takes and outputs `{ name, address: { city, zip } }`. Formisch's path to the city is `['address', 'city']`, and its dot path, which form rules, layouts and conditions use, is `address.city`.

## Field order

Define the fields in the order they appear on the page. When a submit fails, Formisch focuses the first field with an error in the order of the schema, which follows the definition. In a form with [steps](/guide/steps), the adapters' Next button focuses the first field with an error in the order of the layout.

## Next steps

Now that you know the shape of a definition, continue to [field types](/guide/field-types) to see what each type holds and which props it takes.
