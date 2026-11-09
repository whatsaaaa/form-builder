---
'@whatsaaaa/form-builder-schema': minor
---

A definition can say where its fields go, in a new optional `layout`: on one page with `items`, or over `steps`. Items are dot paths, `"*"` for the rest, sections with a title, rows of a 12-column grid whose items take a `span`, slots for content of the app, and display elements written straight into the layout. The layout never changes the value, and every field is placed exactly once. `validate()` checks it, with three new issue codes: `duplicate_placement`, `unplaced_field` and `duplicate_id`. `builder.getLayout(json)` resolves it into the tree renderers walk, and `issuesOfStep`, `fieldPathsOf`, `shownNodes`, `shownSteps`, `checkLayoutComponents` and `allLayoutNodes` help them step through it. `toJsonSchema` and `definition.schema.json` know the layout, and `docs/frameworks.md` renders it in every framework. Definitions without a `layout` validate and build as before.
