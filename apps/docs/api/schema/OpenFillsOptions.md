---
description: 'The options of Fills.open: the initial input the app gave, and where errors go.'
---

# OpenFillsOptions

The options of [`Fills`](/api/schema/Fills)' `open()`.

## Definition

- `OpenFillsOptions`
  - `given` <code>unknown</code>: optional, the initial input the app gave the form, like `useJsonForm`'s `initialInput`
  - `onError` <code>(error: unknown, info: [FillErrorInfo](/api/schema/FillErrorInfo)) =&gt; void</code>: optional, called with each error of a fill

### Explanation

- **`given`**: a trigger it has a key for starts no fill, even with its default, and the fills that run as the form starts leave alone every field it has a key for. So a saved record never loses its values when the form opens.
- **`onError`** gets what a fill's values threw or rejected with, or a `TypeError` when they are no object of values, or a value its field can't hold. An error of a call that was aborted never comes. Without `onError`, the error is thrown in a microtask, like an uncaught one, so it is never lost.

## Related

### Types

- [Fills](/api/schema/Fills)
- [FillErrorInfo](/api/schema/FillErrorInfo)
