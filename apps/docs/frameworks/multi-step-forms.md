---
description: Render a definition with steps in the Vue and React adapters, with Next, Back and a step indicator.
---

# Multi-step forms

When a definition's layout has [steps](/guide/steps), `<JsonFields>` renders the current one, and `jsonForm.steps` moves between them. Below you will learn how to render a form with steps.

## Rendering steps

`jsonForm.steps` is where the form is, and how to move. Render your own step indicator and buttons around `<JsonFields>`:

::: code-group

<<< @/snippets/vue/SignUpSteps.vue [Vue]

<<< @/snippets/react/SignUpSteps.tsx [React]

:::

In Vue, `jsonForm.steps` is reactive, so templates follow it. In React, the component re-renders when it changes.

## Steps

| Member              | What it is                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `list`              | the steps on show, each with its `step` as written (`id`, `label`, `description`, `ui`)       |
| `index`, `current`  | the step `<JsonFields>` renders: its index in `list`, and the step                            |
| `isFirst`, `isLast` | whether it is the first or the last step on show                                              |
| `next()`            | validates, and moves on when the step's fields have no errors. Resolves to whether it moved   |
| `back()`            | moves back, without validating                                                                |
| `goTo(index)`       | moves back freely, or forward through each step on the way, stopping at the first with errors |

## How steps validate

The form is one Formisch form, so Formisch validates all of it at once. The steps make that work:

- **Next** validates the whole form, and only the errors on the current step's fields keep the user there. It focuses the first one, in layout order.
- **A step shows what the user left**: the errors it had when they left it, and none the first time they get there, so errors on steps nobody saw yet stay out of sight.
- **A step that failed Next revalidates** as the user fixes it, on the `revalidate` event, like a form after a failed submit.
- **A submit before the last step is a Next**, so Enter in a text input doesn't submit the form early. On the last step, Formisch submits as usual.
- **A submit that fails because of an earlier step**, like a form rule that reads fields of two steps, goes back to that step.

## Hidden steps

With [conditions](/guide/conditions), `steps.list` holds only the steps on show. A step that is hidden, or whose fields are all hidden, is left out, and Next and Back go past it. The step the user is on stays until they leave it.

## A review page

`<JsonFields>` takes a `step` to render a given step instead of the current one, like on a review page that shows every step. A form without steps has one step, and nothing changes for it.
