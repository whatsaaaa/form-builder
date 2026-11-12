---
description: Render a definition with steps in the Vue and React adapters, with Next, Back, a step indicator and a review of the answers.
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

- **Next is the submit button.** A submit before the last step moves on like Next, so one button does both, and Enter in a field moves on too. A browser only submits a form on Enter when the form has a submit button, or a single text field. With a Next that is a plain button, Enter does nothing.
- **A new step takes the focus.** The fields change, but the focus stays on the button, so nothing tells a keyboard or a screen reader user that another step is on show. The example moves the focus to the step's heading, which `tabindex="-1"` lets it take. When a step comes back because of an error, the adapter focuses the first field with one after that, so the field keeps the focus.

## Steps

| Member              | What it is                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `list`              | the steps on show, each with its `step` as written (`id`, `label`, `description`, `ui`)       |
| `index`, `current`  | the step `<JsonFields>` renders: its index in `list`, and the step                            |
| `isFirst`, `isLast` | whether it is the first or the last step on show                                              |
| `next()`            | validates, and moves on when the step's fields have no errors. Resolves to whether it moved   |
| `back()`            | moves back, without validating                                                                |
| `goTo(index)`       | moves back freely, or forward through each step on the way, stopping at the first with errors |

The submit button needs none of them. `next()` is for a Next outside the form, like one in a toolbar, and `goTo()` for a step indicator that can be clicked.

## How steps validate

The form is one Formisch form, so Formisch validates all of it at once. The steps make that work:

- **Next** validates the whole form, and only the errors on the current step's fields keep the user there. It focuses the first one, in layout order.
- **A step shows what the user left**: the errors it had when they left it, and none the first time they get there, so errors on steps nobody saw yet stay out of sight.
- **A step that failed Next revalidates** as the user fixes it, on the `revalidate` event, like a form after a failed submit.
- **A submit before the last step is a Next**, so Enter in a text input moves on, and doesn't submit the form early. On the last step, Formisch submits as usual.
- **A submit that fails because of an earlier step**, like a form rule that reads fields of two steps, goes back to that step.

## Hidden steps

With [conditions](/guide/conditions), `steps.list` holds only the steps on show. A step that is hidden, or whose fields are all hidden, is left out, and Next and Back go past it. The step the user is on stays until they leave it.

## A review page

`<JsonFields>` takes a `step` to render a given step instead of the current one: the fields of that step again, ready to edit. A form without steps has one step, and nothing changes for it.

To show the answers as text before the user submits, give the last step a [slot](/guide/layout#slots) in place of fields:

<!-- docs: fragment -->

```json
{
  "id": "confirm",
  "label": "Check your answers",
  "items": [{ "type": "slot", "name": "review" }]
}
```

The adapter has all a review needs: the layout of each step, the form's input, and what the conditions hide. This function walks a step, and gives a label and a text for each of its fields:

<<< @/snippets/schema/review.ts

- `shownNodes()` leaves out what [conditions](/guide/conditions) hide. It doesn't look into the items of a list, so the function calls it again for each item, with the item's index.
- `toFieldPath()` puts those indexes into a field's `dataPath`, which gives its path in the input.
- The labels, and "Yes", "No" and "Not answered", are yours to translate.

Render the rows of every step before the review, from `jsonForm.steps.list`, Formisch's `getInput()` and `jsonForm.visibility`:

::: code-group

<<< @/snippets/vue/ReviewList.vue [Vue]

<<< @/snippets/react/ReviewList.tsx [React]

:::

Then fill the slot with it:

::: code-group

<<< @/snippets/vue/SignUpReview.vue#review [Vue]

<<< @/snippets/react/SignUpReview.tsx#review [React]

:::

The review is the last step, so its submit button submits the form. `goTo()` takes the user back to a step to change an answer, and Next brings them to the review again.
