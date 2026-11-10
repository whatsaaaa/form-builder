---
description: form-builder turns JSON form definitions into Valibot schemas for Formisch, with the fields, validation, layout and conditions they describe.
---

# Introduction

form-builder turns a JSON form definition into a [Valibot](https://valibot.dev) schema that [Formisch](https://formisch.dev) understands, with the fields, validation, layout and conditions it describes. It is meant for forms that don't belong in your source code: forms stored in a database, served by an API or put together in a visual editor.

## Highlights

- A field type for every native control, plus groups, lists and display elements
- Every Valibot action that fits in JSON as a validation rule, and form rules that compare fields
- Sections, a 12-column grid and multi-step forms, described in the definition
- Fields, sections and steps that show, hide and clear by the values of other fields
- Checks that report every problem in a definition, and a JSON Schema for editor autocompletion
- Your own field types, rules and messages, with i18n through Valibot
- A framework-agnostic core that works with Formisch in Vue, React, Preact, Solid, Svelte, Qwik and Angular

## Example

A definition is plain JSON. It lists the fields of the form, and for each one its type, its label and the rules its value must pass:

```json
{
  "version": "1",
  "fields": [
    {
      "name": "email",
      "type": "email",
      "label": "Email",
      "required": true
    },
    {
      "name": "password",
      "type": "password",
      "label": "Password",
      "required": true,
      "rules": [
        {
          "rule": "minLength",
          "value": 10,
          "message": "At least 10 characters"
        }
      ]
    }
  ]
}
```

The schema package checks the definition and builds the Valibot schema of the whole form. Pass it to Formisch, or parse a value with it yourself:

<<< @/snippets/schema/introduction.ts

To render the form, the [Vue](/frameworks/vue) and [React](/frameworks/react) adapters connect every field to Formisch and render it with a component of yours. In Preact, Solid, Svelte, Qwik and Angular, you use Formisch's own package with the schema, and start from a [tested renderer](/frameworks/formisch).

## Packages

| Package                                              | What it does                                                    |
| ---------------------------------------------------- | --------------------------------------------------------------- |
| [`@whatsaaaa/form-builder-schema`](/api/schema/)     | Checks definitions and builds Formisch-ready Valibot schemas    |
| [`@whatsaaaa/form-builder-affects`](/api/affects/)   | Conditions that show, hide and clear fields, sections and steps |
| [`@whatsaaaa/form-builder-vue`](/frameworks/vue)     | Renders definitions with Formisch and your own Vue components   |
| [`@whatsaaaa/form-builder-react`](/frameworks/react) | Renders definitions with Formisch and your own React components |

## When to use it

If you know your forms when you write your app, write their Valibot schemas and use Formisch directly. You get the most type safety that way, and you need nothing from here.

form-builder is for the other case: the form is data. Someone edits it without a deploy, a backend decides which fields a customer sees, or one renderer shows hundreds of different forms. The definition stays plain JSON you can store, version and check, and the schema it builds behaves like one you wrote by hand: Formisch validates, focuses and submits it the same way.

## Status

The schema, Vue and React packages follow semantic versioning from 1.0: the JSON format, the exports, and the codes and paths of issues only break in a major release. The affects package stays before 1.0 for now. See [stability](/guide/stability) for what is covered, [supported versions](/guide/support) for the versions of the peers, and [migrating to 1.0](/guide/migrating-to-1.0) to update. Each package's changelog lists what changed.

## Feedback

Found a bug, or have an idea? Please open an [issue on GitHub](https://github.com/whatsaaaa/form-builder/issues).

## License

form-builder is free and open source under the [MIT license](https://github.com/whatsaaaa/form-builder/blob/main/LICENSE). It is built on [Formisch](https://formisch.dev) and [Valibot](https://valibot.dev).
