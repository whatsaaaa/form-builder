---
description: Validate what a form sends on your server, with the same definition and the same schema, show its errors in the form, and avoid the traps of dates, missing keys and files.
---

# Validating on the server

The schema a definition builds is a plain Valibot schema, so it validates on a server just like in the browser. Never trust what a request sends: run it through the same schema the form used. Below you will learn how, and what changes when the value travels as JSON.

## Parse the request

Build the schema from the same definition the form rendered, with a builder that has the same options, and parse the request's body with `v.safeParse`:

<<< @/snippets/schema/server-validation.ts#handler

`handleSignup` takes the parsed body and returns the status and the answer, so it fits the route handler of any server framework.

- **Use the same builder options** as the client: the same [extensions](/guide/extensions), [field types](/guide/custom-field-types), [rules](/guide/custom-rules) and [messages](/guide/messages). Without the affects extension, for example, a definition with conditions fails to build.
- **Use the same definition.** When people edit your definitions, store each version, and validate a request against the one the form showed, for example by an id the form sends along.
- **Keys the definition doesn't know are dropped** from the output, as `v.object` does.
- [Form rules](/guide/form-rules) and [conditions](/guide/conditions) run on the server too. A hidden field isn't validated. A field that `hideAndClear` hides outputs nothing, and one hidden otherwise outputs its value when it is valid.
- Build the schema once for each definition, and reuse it for every request.

## Show the errors in the form

The answer has each message with the path of its field, as a list of keys: the path Formisch takes. `v.flatten()` would give dot paths like `lines.0.quantity` instead, which nothing turns back into a path. In the browser, set the messages with Formisch's `setErrors`, and move the focus to the first field with `focus`:

::: code-group

<<< @/snippets/vue/server-issues.ts#show [Vue]

<<< @/snippets/react/server-issues.ts#show [React]

:::

Call it with the server's answer, in the submit handler you give Formisch's `<Form>`:

::: code-group

<<< @/snippets/vue/server-issues.ts#submit [Vue]

<<< @/snippets/react/server-issues.ts#submit [React]

:::

- **The cast goes on the whole config.** TypeScript can't check a path that comes from data. For `focus`, `{ path: path as never }` is enough. `setErrors` picks the type of its config by the path, so `setErrors(form, { path: path as never, errors })` doesn't compile. Cast the config instead: `{ path, errors } as never`.
- **The messages stay until the form validates again.** After a submit, that is the user's next change, in any field: Formisch then shows what the schema finds, and a message only the server knows, like a taken email, is gone.
- **In a form with [steps](/frameworks/multi-step-forms), the adapters clear them at once.** When a submit ends with errors on the form, the adapters validate it again to find the step the errors are on, and the schema finds none. There, show the server's messages in your own markup, like a list above the form, and take the user to a step with `steps.goTo()`.

## Languages

Valibot's `setGlobalConfig({ lang })` is one setting for the whole process, which on a server means every request. Pass the language to each parse instead, like the one from the request's `Accept-Language` header:

<<< @/snippets/schema/server-validation.ts#lang

`lang` picks [Valibot's own messages](/guide/messages#translating-valibot-s-messages). The messages of the definition come from the builder's `resolveMessage`, so build one schema for each language they are in.

## Missing keys

Formisch always sends every key of the form, but a request from somewhere else may leave one out. A required field whose key is missing reports its required message, the same as one that is `undefined`:

<<< @/snippets/schema/server-validation.ts#missing-key

Before 1.0, it reported Valibot's own `Invalid key: Expected "email" but received undefined`. See [migrating to 1.0](/guide/migrating-to-1.0#behavior-changes).

## Dates

A `date` or `datetime` with [`"output": "date"`](/guide/field-types#dates-and-times) outputs a `Date`. JSON has no dates, so `JSON.stringify` writes it as a full timestamp, which the field rejects on the server:

<<< @/snippets/schema/server-validation.ts#dates

So send the form's **input**, not its output. Formisch's `getInput(form)` gives it, and the server's parse makes the same output from it. Or leave out `"output": "date"` in forms that go to a JSON API, and turn the ISO string into a date on the server.

The same goes for any output that JSON changes: validate the value the schema takes, never the one it gave.

## Files

A `file` holds a `File`, which JSON can't carry. Send the request as `multipart/form-data` instead: the input as JSON in one part, and each file in a part of its own. On the server, put the files back where the definition has them, and parse:

<<< @/snippets/schema/server-validation.ts#files

- Node 20 and later have `File`, `FormData` and `Request` as globals, and most servers give a request's `formData()`. The schema reads the `File` global while it parses.
- For a field with `"multiple": true`, append each file under the same name, and read them with `data.getAll(name)`.
- A `File` only knows the MIME type the browser gave it. `accept` and the file rules check that and the size, not the content, so check the content of a file on your server before you trust it.

## Next steps

See [supported versions](/guide/support) for the Node versions the packages run on, and [checking definitions](/guide/checking-definitions) to check a definition before you store it.
