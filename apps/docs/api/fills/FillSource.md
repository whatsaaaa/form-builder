---
description: 'A source of the values of a fill: a function of the trigger value that gives the values of its fields, at once or in a promise.'
---

# FillSource

Gives the values of a fill's fields for a value of its trigger, at once or in a promise, like from a call to your server. Register it with [`fills({ sources })`](/api/fills/fills), and name it in a fill's `source`.

```ts
type FillSource = (
  value: FillTriggerValue,
  context: FillSourceContext,
) => FillResult | PromiseLike<FillResult>
```

## Parameters

- `value` <code>[FillTriggerValue](/api/schema/TargetFill#filltriggervalue)</code>: the trigger's value: a string, a number for a number field or a select with number options, a boolean for a checkbox, or the ISO string of a date. It is never empty
- `context` <code>[FillSourceContext](/api/fills/FillSourceContext)</code>: the trigger, the fields the fill sets, the form's input, and an `AbortSignal`

## Returns

- `values` <code>[FillResult](/api/schema/TargetFill#fillresult) | PromiseLike&lt;FillResult&gt;</code>: the values of the fields by dot path, like `{ firstName: 'Marko', 'address.city': 'Beograd' }`, or a promise of them

## Explanation

- **The fill sets only the fields its `fields` lists.** A key the source gives for any other field is ignored, so a whole record from your server works as it is.
- **A field the values leave out, or give `null`, is set blank.** `null` or `undefined` instead of the values sets every field blank.
- **Each value is fitted to its field**, like typed input: `'5'` becomes `5` for a number field, and `11000` becomes `'11000'` for a text field. A value of a type its field can't hold is set blank, and reported as a `TypeError`.
- **The newest value wins.** When the trigger gets another value, is cleared, or the form closes, `context.signal` is aborted and what the call gives is dropped. Pass the signal to `fetch()`, so the request is cancelled too.
- **Errors go to the app.** What the source throws or rejects with goes to the form's error handler, like `onError` of [`Fills.open()`](/api/schema/Fills), unless the call was aborted by then. The library shows no error: that is the app's to do.

## Example

<<< @/snippets/schema/profiles.ts

## Related

### Functions

- [fills](/api/fills/fills)

### Types

- [FillSourceContext](/api/fills/FillSourceContext)
