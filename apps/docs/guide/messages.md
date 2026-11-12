---
description: Set the required message, translate the messages of a definition, and use Valibot's translations.
---

# Messages and i18n

Every error a form shows is a message: a field's required message, a rule's `message`, or Valibot's own. Below you will learn where each one comes from, and how to translate them.

## Where messages come from

- **The required message** is the field's own, from `"required": { "message": "..." }`, or else the builder's `messages.required`, which defaults to `"Required"`.
- **A rule's message** is its `message`. A rule without one reports Valibot's own message, like "Invalid length: Expected >=10 but received 5".
- **A form rule's message** is its `message`, which it always has.

## Translating your messages

`resolveMessage` is called with every message of the definition, every label and every description, and the required message of every required field without its own. Return the text to use, or `undefined` to keep the text as written. Write keys in the definition, and translate them here:

<<< @/snippets/schema/messages.ts#resolve

The schema then reports the translated messages:

<<< @/snippets/schema/messages.ts#build

The second argument of `resolveMessage` is a [`MessageContext`](/api/schema/MessageContext): the `field` the text belongs to, the `rule` for a rule's message, and the `path` of the field in the definition. Build one builder per language, or read the current language inside `resolveMessage`. A builder resolves the messages when it builds the schema, so build the form again when the language changes.

### Changing the language

Make one builder per language, once:

<<< @/snippets/schema/locales.ts#builders

A form built again is a new form. It starts empty, with the defaults of the definition, and what the user typed is gone unless you pass it on. In the Vue and React adapters, read the input of the old form with Formisch's `getInput`, and give it to the new one as the `initialInput` of `useJsonForm` ([Vue](/api/vue/UseJsonFormOptions#initial-input), [React](/api/react/UseJsonFormOptions#initial-input)):

::: code-group

<<< @/snippets/vue/TranslatedForm.vue [Vue: TranslatedForm.vue]

<<< @/snippets/vue/TranslatedCheckout.vue [Vue: TranslatedCheckout.vue]

<<< @/snippets/react/TranslatedCheckout.tsx#switch [React]

:::

- **The key builds the form again**, with the builder of the language. `useJsonForm` reads the builder and the initial input once.
- **Every value comes along.** A field the user cleared stays blank and doesn't get its default back, because its key is there.
- **The errors on show don't come along.** The new form validates as its modes say, and reports in the new language.
- **A form with steps** starts on its first step again.

With Formisch's own packages, pass the old form's input as the `initialInput` of the new form, in place of the builder's `getInitialInput()`.

## Translating Valibot's messages

A rule without a `message` reports Valibot's own, so Valibot's [i18n package](https://valibot.dev/guides/internationalization/) translates it, with no setup here. Import the languages you need and set the language with Valibot's `setGlobalConfig`.

The object schema of a list of fields has a message of its own, which gives a required field whose key is missing its required message. Its other errors, like an input that is no object, get the message you set with `setSpecificMessage(v.object, ...)`, `setSchemaMessage` or `setGlobalMessage`, else Valibot's own. A `message` in the config of a single parse, like `v.parse(schema, input, { message })`, doesn't reach them, because Valibot uses a schema's own message first. It still reaches the errors of the fields.

## Labels and text in components

`resolveMessage` changes what goes into the schema: messages, and the label and description the schema carries as metadata. Your components get each field as the definition has it, so translate `field.label`, `field.placeholder`, the `text` of display elements, and the labels of options in your components, with the same function.
