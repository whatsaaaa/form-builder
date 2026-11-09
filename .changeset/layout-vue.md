---
'@whatsaaaa/form-builder-vue': minor
---

`<JsonFields>` renders the definition's `layout`: its current step, with your components for sections and rows from the new `layoutComponents` option, and named slots for its slots. `jsonForm.steps` moves through the steps: Next validates the whole form and stays on issues of the current step, a step shows the errors it had when the user left it, a step that failed Next revalidates as the user fixes it, and a submit before the last step moves on like Next. `jsonForm.layout` is the resolved layout, and `<JsonFields :step>` renders a given step. Definitions without a `layout` render as before.
