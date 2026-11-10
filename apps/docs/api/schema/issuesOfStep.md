---
description: The issues of a validation result that are on the fields of a step.
---

# issuesOfStep

Gives the issues of a Valibot result that are on the fields placed in a step, in layout order.

```ts
const issues = issuesOfStep(step, issues)
```

## Parameters

- `step` <code>[LayoutStep](/api/schema/FormLayout#layoutstep)</code>
- `issues` <code>readonly BaseIssue&lt;unknown&gt;[] | undefined</code>: like those of Formisch's `validate(form)`

### Explanation

A form is validated as a whole, so its issues are on the fields of every step. These are the ones that keep the user on this one. Each has the `issue`, the `field` it is on, and the field's Formisch `path` with the indexes from the issue.

## Returns

- `issues` <code>[StepIssue](/api/schema/issuesOfStep#stepissue)[]</code>

## StepIssue

- `StepIssue`
  - `issue` `BaseIssue<unknown>`: Valibot's issue
  - `field` [`FieldNode`](/api/schema/FieldNode): the field it is on
  - `path` [`FieldPath`](/api/schema/toFieldPath#fieldpath): the field's Formisch path, like `['lines', 0, 'product']`

## Related

### Functions

- [fieldPathsOf](/api/schema/fieldPathsOf)

### Guides

- [Rendering with Formisch](/frameworks/formisch#steps)
