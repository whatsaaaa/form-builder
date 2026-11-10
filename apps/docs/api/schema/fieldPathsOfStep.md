---
description: The Formisch path of every field placed in a step, for an input.
---

# fieldPathsOfStep

Gives the Formisch path of every field with a value placed in a step, for an input, with the fields of each list item there is.

```ts
const paths = fieldPathsOfStep(step, input)
```

## Parameters

- `step` <code>[LayoutStep](/api/schema/FormLayout#layoutstep)</code>
- `input` <code>unknown</code>: the form's input, like Formisch's `getInput(form)`

### Explanation

The paths are in layout order, a group or a list before its fields: `['lines', 0, 'product']`, `['lines', 1, 'product']`. Use them to clear a step's errors with Formisch's `setErrors` when the user first gets to it.

## Returns

- `paths` <code>[FieldPath](/api/schema/toFieldPath#fieldpath)[]</code>

## Related

### Functions

- [issuesOfStep](/api/schema/issuesOfStep)

### Guides

- [Rendering with Formisch](/frameworks/formisch#steps)
