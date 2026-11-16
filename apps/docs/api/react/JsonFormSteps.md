---
description: 'The steps of a useJsonForm form in React: where the form is, and how to move.'
---

# JsonFormSteps

The steps of a form, from its layout. A form without `steps` in its layout has one.

## Definition

- `JsonFormSteps`
  - `list` <code>readonly [LayoutStep](/api/schema/FormLayout#layoutstep)[]</code>: the steps on show. A hidden step is left out, unless it is the current one
  - `index` <code>number</code>: the index of the current step in `list`
  - `current` <code>[LayoutStep](/api/schema/FormLayout#layoutstep)</code>: the step `<JsonFields>` renders
  - `isFirst` <code>boolean</code>
  - `isLast` <code>boolean</code>
  - `next` <code>() =&gt; Promise&lt;boolean&gt;</code>: waits for pending fills, validates, and moves on when the step's fields have no issues. Resolves to whether it moved
  - `back` <code>() =&gt; void</code>: moves back, without validating
  - `goTo` <code>(index: number) =&gt; Promise&lt;boolean&gt;</code>: moves back freely, or forward through each step on the way, stopping at the first with issues

### Explanation

See [multi-step forms](/frameworks/multi-step-forms) for how the steps validate. Moving forward with `next()` or `goTo()` waits for the [fills](/frameworks/react#fills) that are pending first, so it validates the values they set, not the blanks before them, and moves among the steps on show for them. A step the user goes to while it waits wins, as does a reset, and it resolves to `false`. `back()` doesn't wait. [`jsonForm.reset()`](/api/react/JsonFormInstance) goes back to the first step, and keeps no errors of the steps the user left, or of a Next that failed.

## Example

<<< @/snippets/react/SignUpSteps.tsx

## Related

### Types

- [JsonFormInstance](/api/react/JsonFormInstance)
- [FormLayout](/api/schema/FormLayout#layoutstep)
