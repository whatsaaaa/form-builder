---
'@whatsaaaa/form-builder-vue': minor
---

`useJsonForm` takes `initialInput`: the values the form starts with, like a record to edit. They go over the definition's defaults, so a field without a key keeps its `default`, in groups and in the items of lists too, and a key that is there wins, so `undefined` starts a field blank. Pass the input of the old form to keep what the user typed when you build the form again with a new `:key`, like for another language. With `useJsonForm<TInput>()` it is typed by your input type, with every key optional. `UseJsonFormOptions` has a type parameter for that, the form's schema, which defaults to `BuiltSchema`. Every rule is in https://whatsaaaa.github.io/form-builder/api/vue/UseJsonFormOptions#initial-input.
