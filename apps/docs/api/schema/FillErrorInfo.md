---
description: 'Where an error of a fill comes from: its trigger, the value, and the field.'
---

# FillErrorInfo

Where an error of a fill comes from, as [`OpenFillsOptions`](/api/schema/OpenFillsOptions)' `onError` gets it.

## Definition

- `FillErrorInfo`
  - `trigger` <code>string</code>: the trigger's dot path, like `'profile'`
  - `value` <code>[FillTriggerValue](/api/schema/TargetFill#filltriggervalue)</code>: the value of the trigger the fill ran for
  - `field` <code>string</code>: optional, the dot path of the field that can't hold the value it was given

## Related

### Types

- [OpenFillsOptions](/api/schema/OpenFillsOptions)
