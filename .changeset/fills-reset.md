---
'@whatsaaaa/form-builder-schema': minor
---

`FillsRun` has `reset()`, to call after the form is reset, like with Formisch's `reset`: the input the form holds then is the one its fills start from again. Each trigger's value counts as handled, so nothing is filled, and no field counts as edited, so the next value sets every field the user hasn't changed since. It cancels the fills pending, except those of the values the form starts with.
