---
description: 'What a source of a fill gets with the value of its trigger: an AbortSignal, the trigger, the fields and the input.'
---

# FillSourceContext

What a [source](/api/fills/FillSource) gets with the value of the trigger. It is a [`FillContext`](/api/schema/TargetFill#fillcontext), with the trigger and the fields the fill sets.

## Definition

- `FillSourceContext`
  - `signal` <code>AbortSignal</code>: aborted when the trigger gets another value or is cleared, or the form closes. Pass it to `fetch()`
  - `input` <code>Readonly&lt;Record&lt;string, unknown&gt;&gt;</code>: the form's input when the fill started, to send other fields along
  - `trigger` <code>string</code>: the trigger's dot path, like `'profile'`, for a source that several fields use
  - `fields` <code>readonly string[]</code>: the fields the fill sets, by dot path, as its `fields` lists them

## Related

### Types

- [FillSource](/api/fills/FillSource)
