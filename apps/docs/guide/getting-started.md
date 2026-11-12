---
description: Write a form definition, check it, and render it with the Vue or React adapter.
---

# Getting started

Below you will write a definition for a small sign-up form, check it, and render it with the Vue or React adapter. If you haven't yet, [install](/guide/installation) the packages for your framework first. Any Vue or React project works. To start a new one, `pnpm create vite` with the `vue-ts` or `react-ts` template is enough.

## Write a definition

A definition describes a form as JSON: its `version`, which is always `"1"` for now, and its `fields`. Each field has a `name`, which is its key in the form's value, and a `type`:

```json
{
  "version": "1",
  "fields": [
    {
      "name": "email",
      "type": "email",
      "label": "Email",
      "required": true,
      "rules": [
        {
          "rule": "email",
          "message": "Enter a valid email address"
        }
      ]
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
    },
    {
      "name": "newsletter",
      "type": "checkbox",
      "label": "Send me the newsletter"
    }
  ]
}
```

The `email` type checks that the value is an email address. `required` makes a field required, and `rules` adds checks of your own, each with an optional `message`. The `email` rule here adds no second check: it replaces the one the type runs on its own, to give it a message. The [define your form](/guide/define-your-form) guide goes through every key.

## Check it

A definition that comes from outside your code, like one from a database, can have mistakes: a misspelled type, a rule that doesn't fit the field, two fields with the same name. `validate()` never throws. It returns every problem it finds, so you can check a definition before you use it:

<<< @/snippets/schema/getting-started.ts#check

The adapters build the form with `build()`, which runs the same checks and throws a `DefinitionError` with every problem.

## Add field components

The adapters are headless: they connect every field to Formisch, but render nothing of their own. You give them a component for each field type, so the form looks like the rest of your app. A text input looks like this:

::: code-group

<<< @/snippets/vue/TextInput.vue [Vue]

<<< @/snippets/react/TextInput.tsx [React]

:::

Spread `inputProps` on the input element, so Formisch knows its name and can focus it. Set the value with `setInput`. Then map each field type the definition uses to a component:

::: code-group

<<< @/snippets/vue/fields.ts [Vue]

<<< @/snippets/react/fields.ts [React]

:::

## Render the form

`useJsonForm` builds the schema and the initial input, and creates the Formisch form. `<JsonFields>` renders its fields inside Formisch's `<Form>`. The form element and the submit button are yours:

::: code-group

<<< @/snippets/vue/SignUpForm.vue [Vue]

<<< @/snippets/react/SignUpForm.tsx [React]

:::

When the user submits, Formisch validates the whole form against the schema. It shows the errors on the fields and focuses the first one, or calls your submit handler with the output.

## Handle the output

The output is what the schema gives for the input: text as typed, numbers as numbers, and optional fields that are empty left out. Rules that normalize, like `trim`, have already run. Its type is `unknown`, because the definition is data that TypeScript can't see. When you know the shape, give `useJsonForm` your types: see [TypeScript](/guide/typescript).

## Next steps

You now have a working form. To learn what a definition can describe, continue with [define your form](/guide/define-your-form). For the components of every field type, see [field components](/frameworks/field-components).
