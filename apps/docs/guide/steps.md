---
description: Split a form into pages with the steps of its layout, and learn how each step validates.
---

# Steps

A layout with `steps` splits a form into pages, like an account step and a profile step. Below you will learn how to write steps, and how a form with steps validates.

## Adding steps

`steps` goes in the layout, in place of `items`. Each step takes `items`, like a layout, and an optional `id`, `label`, `description` and `ui`:

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
      "required": true
    },
    {
      "name": "firstName",
      "type": "text",
      "label": "First name",
      "required": true
    },
    {
      "name": "lastName",
      "type": "text",
      "label": "Last name",
      "required": true
    },
    {
      "name": "newsletter",
      "type": "checkbox",
      "label": "Send me the newsletter"
    }
  ],
  "layout": {
    "steps": [
      {
        "id": "account",
        "label": "Account",
        "items": ["email", "password"]
      },
      {
        "id": "profile",
        "label": "About you",
        "items": [
          { "type": "row", "items": ["firstName", "lastName"] },
          "*"
        ]
      }
    ]
  }
}
```

`"*"` places the fields placed on no step. A field placed nowhere is an issue, as on a page without steps.

## One form, one schema

A form with steps is still one Formisch form, with one schema for all of its fields. Formisch validates the whole form at once, so a step can't validate on its own. Instead, Next validates the whole form, and keeps the user on the step only for the errors on its own fields:

1. **Next** validates the whole form. When the current step's fields have errors, it stays, and focuses the first one. Otherwise it moves on.
2. **A step starts clean.** That validation also set errors on the fields of the next step, which the user hasn't seen yet. They are cleared when the user gets there.
3. **Back never validates.** Submit is on the last step: Formisch validates the whole form again, so a form rule that reads fields of two steps still works.

The Vue and React adapters do all of this, and more:

- A step shows the errors it had when the user left it.
- A step that failed Next revalidates as the user fixes it, like a form after a failed submit.
- A submit before the last step, like Enter in a text input, moves on like Next. For Enter to submit, a form needs a submit button, so make Next [that button](/frameworks/multi-step-forms#rendering-steps).
- A submit that fails because of an earlier step goes back to it.

See [multi-step forms](/frameworks/multi-step-forms) for the adapters' `steps`, and [rendering with Formisch](/frameworks/formisch#steps) to build it yourself.

## Steps and conditions

With the [affects package](/guide/conditions), a step can hide by the values of other fields, like a company step for a business account only. A step whose fields are all hidden hides too. Next and Back skip a hidden step.

## Next steps

Continue to [conditions](/guide/conditions) to learn how to show and hide fields, sections and steps.
