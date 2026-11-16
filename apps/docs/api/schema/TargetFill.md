---
description: "What one field's fill sets, as an extension adds it with ctx.fill()."
---

# TargetFill

What the fill of one field sets, as an extension adds it with `ctx.fill()`. See [`ExtensionContext`](/api/schema/SchemaExtension#extensioncontext).

## Definition

- `TargetFill`
  - `fields` <code>readonly { field: [ResolvedField](/api/schema/SchemaExtension#resolvedfield); at: [DefinitionPath](/api/schema/DefinitionIssue#definitionpath) }[]</code>: the fields it sets, found with `ctx.resolve()`, and where the definition names each
  - `overwrite` <code>'unedited' | 'always'</code>: `'unedited'` leaves a field the user changed since the last fill, and `'always'` sets it anyway
  - `static` <code>boolean</code>: true when `values()` gives the same values for the same value at once, from the definition alone, like a map written in it. A form then starts with the values for its trigger's default
  - `values` <code>(value: [FillTriggerValue](/api/schema/TargetFill#filltriggervalue), ctx: [FillContext](/api/schema/TargetFill#fillcontext)) =&gt; [FillResult](/api/schema/TargetFill#fillresult) | PromiseLike&lt;FillResult&gt;</code>: the values of the fields for a value of the trigger, by the dot path of each field, or a promise of them. Called only with a value

### Explanation

See [fills](/guide/extensions#fills).

## FillTriggerValue

```ts
type FillTriggerValue = string | number | boolean
```

The value of a fill's trigger, as [`coerceInput`](/api/schema/coerceInput) reads it: a number for a select with number options, and a date as its ISO string. It is never empty.

## FillResult

```ts
type FillResult = Readonly<Record<string, unknown>> | null | undefined
```

The values a fill sets, by the dot path of each field, like `{ firstName: 'Marko', 'address.city': 'Beograd' }`. A key that names no field of the fill is ignored, and a field it leaves out is set blank. Null and undefined set every field of the fill blank.

## FillContext

- `FillContext`
  - `signal` <code>AbortSignal</code>: aborted when the trigger gets another value or is cleared, or the form closes. Pass it to `fetch()`
  - `input` <code>Readonly&lt;Record&lt;string, unknown&gt;&gt;</code>: the form's input when the fill started

## Example

<<< @/snippets/schema/extensions.ts#fill

## Related

### Types

- [Fills](/api/schema/Fills)
- [SchemaExtension](/api/schema/SchemaExtension)
