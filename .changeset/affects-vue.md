---
'@whatsaaaa/form-builder-vue': minor
---

Conditions: with a builder that has extensions, like `createSchemaBuilder({ extensions: [affects()] })`, `<JsonFields>` and `<JsonField>` leave out the fields, sections, rows and groups the conditions hide, `steps.list` leaves out the steps whose fields are all hidden, and Next and Back skip them. `useJsonForm` sets the fields `hideAndClear` clears blank with Formisch's `setInput`, wherever they render, and `jsonForm.visibility` is the state for your own renderers. Without conditions, nothing changes.

Fixed: a Next button that turns into the submit button on the last step no longer submits the form as the user gets there, which showed the last step's errors at once in a browser.
