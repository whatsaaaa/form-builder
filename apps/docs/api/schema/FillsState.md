---
description: 'What the fills of a form are waiting for now.'
---

# FillsState

What the fills of a form are waiting for now, as [`FillsRun`](/api/schema/FillsRun)' `state` gives it.

## Definition

- `FillsState`
  - `pending` <code>readonly string[]</code>: the dot path of each trigger whose fill waits for its values, in document order
  - `isPending` <code>(path: [FieldPath](/api/schema/toFieldPath#fieldpath)) =&gt; boolean</code>: true while a fill waits for the value of the field at `path`, as its trigger or as a field it sets

### Explanation

Show the user that values are on their way, like a spinner on each field where `isPending` is true, and disable submitting while `pending` isn't empty. A fill whose values come at once, like a map, is never pending.

## Related

### Types

- [FillsRun](/api/schema/FillsRun)
