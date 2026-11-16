---
description: "A definition's fills, as getFills gives them: what a form starts with, and what runs while it is open."
---

# Fills

The fills of a definition's extensions, as the builder's [`getFills()`](/api/schema/SchemaBuilder#getfills) gives them: what a form starts with, and what runs while it is open.

## Definition

- `Fills`
  - `active` <code>boolean</code>: true when the definition has fills. When false, `open()` gives a run that does nothing
  - `triggers` <code>readonly [FieldPath](/api/schema/toFieldPath#fieldpath)[]</code>: the Formisch path of each trigger, in document order, to watch
  - `initialInput` <code>&lt;T&gt;(input: T, given: unknown) =&gt; T</code>: the input a form starts with, with the values of the static fills whose trigger starts from its default
  - `open` <code>(form: [FillsForm](/api/schema/FillsForm), options?: [OpenFillsOptions](/api/schema/OpenFillsOptions)) =&gt; [FillsRun](/api/schema/FillsRun)</code>: starts the fills of one form

### Explanation

- **`initialInput(input, given)`** takes the defaults with the app's initial input `given` over them. A static fill, like a map written in the definition, sets its fields there when its trigger starts with a value and `given` has no key for the trigger. It leaves alone every field `given` has a key for. Apply the conditions' [`clear()`](/api/schema/Visibility) after it. The builder's [`getInitialInput()`](/api/schema/SchemaBuilder#getinitialinput) does both already, with nothing given.
- **`open(form, options)`** has no side effects, so it can run on a server. Call `start()` on the run once the form is on the page, `update()` after each change of the input, and `stop()` when the form closes.

How a running fill behaves is in [extensions](/guide/extensions#fills).

## Example

<<< @/snippets/schema/extensions.ts#run

## Related

### Types

- [FillsForm](/api/schema/FillsForm)
- [FillsRun](/api/schema/FillsRun)
- [OpenFillsOptions](/api/schema/OpenFillsOptions)
- [TargetFill](/api/schema/TargetFill)
