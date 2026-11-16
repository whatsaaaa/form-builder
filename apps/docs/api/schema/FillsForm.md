---
description: 'How fills read and set one form, like a Formisch form.'
---

# FillsForm

How [`Fills`](/api/schema/Fills) read and set one form, like a Formisch form.

## Definition

- `FillsForm`
  - `getInput` <code>() =&gt; unknown</code>: the form's input now, like Formisch's `getInput(form)`, read without subscribing
  - `setInput` <code>(path: [FieldPath](/api/schema/toFieldPath#fieldpath), input: unknown) =&gt; void</code>: sets a field's input as a change, like Formisch's `setInput`
  - `setStartInput` <code>(path: [FieldPath](/api/schema/toFieldPath#fieldpath), input: unknown) =&gt; void</code>: sets a field's input as the one it starts with, so it isn't a change, like Formisch's `reset(form, { path, initialInput })`

### Explanation

Fills set the values of a fill that runs as the form starts with `setStartInput`, so a form isn't changed because its default filled other fields. Every later value goes through `setInput`, like the user's own input.

## Related

### Types

- [Fills](/api/schema/Fills)
