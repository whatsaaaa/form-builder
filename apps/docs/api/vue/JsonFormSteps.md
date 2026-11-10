---
description: 'The steps of a useJsonForm form in Vue: where the form is, and how to move.'
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
  - `next` <code>() =&gt; Promise&lt;boolean&gt;</code>: validates, and moves on when the step's fields have no issues. Resolves to whether it moved
  - `back` <code>() =&gt; void</code>: moves back, without validating
  - `goTo` <code>(index: number) =&gt; Promise&lt;boolean&gt;</code>: moves back freely, or forward through each step on the way, stopping at the first with issues

### Explanation

See [multi-step forms](/frameworks/multi-step-forms) for how the steps validate.

## Example

<<< @/snippets/vue/SignUpSteps.vue

## Related

### Types

- [JsonFormInstance](/api/vue/JsonFormInstance)
- [FormLayout](/api/schema/FormLayout#layoutstep)
