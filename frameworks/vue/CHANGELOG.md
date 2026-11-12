# @whatsaaaa/form-builder-vue

## 1.0.0-rc.2

### Patch Changes

- [#61](https://github.com/whatsaaaa/form-builder/pull/61) [`cc0ae9a`](https://github.com/whatsaaaa/form-builder/commit/cc0ae9aba80a17c6faa3df7f4f0237428e85d91d) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - In a form with steps, the errors your submit handler sets with Formisch's `setErrors`, like the messages of a server that rejects the input, now stay on their fields. Before, they were gone at once: after a submit that left errors, the steps validated the form again to find the step to go back to, which put the schema's result over them. The steps now read the errors the form has. A message on a field of an earlier step takes the user back to that step, with the field focused, like a form rule that fails there. The form's own error from a submit handler that throws stays too. The user's next edit still validates the form again, as in a form without steps.

## 1.0.0-rc.1

### Minor Changes

- [#58](https://github.com/whatsaaaa/form-builder/pull/58) [`7b8a4e4`](https://github.com/whatsaaaa/form-builder/commit/7b8a4e472dc1afe794ddb28b97a79fa23642c188) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - `useJsonForm` takes `initialInput`: the values the form starts with, like a record to edit. They go over the definition's defaults, so a field without a key keeps its `default`, in groups and in the items of lists too, and a key that is there wins, so `undefined` starts a field blank. Pass the input of the old form to keep what the user typed when you build the form again with a new `:key`, like for another language. With `useJsonForm<TInput>()` it is typed by your input type, with every key optional. `UseJsonFormOptions` has a type parameter for that, the form's schema, which defaults to `BuiltSchema`. Every rule is in https://whatsaaaa.github.io/form-builder/api/vue/UseJsonFormOptions#initial-input.

## 1.0.0-rc.0

### Major Changes

- [#55](https://github.com/whatsaaaa/form-builder/pull/55) [`437962d`](https://github.com/whatsaaaa/form-builder/commit/437962da55433b2cde556580e85252b55f2e3325) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - 1.0. From here the package follows semantic versioning: a patch fixes bugs, a minor adds, and only a major breaks. What that covers, including the parts of Formisch the adapter reads outside Formisch's own semver, is in the stability policy, https://whatsaaaa.github.io/form-builder/guide/stability, and the versions it supports are in https://whatsaaaa.github.io/form-builder/guide/support. Its peer `@whatsaaaa/form-builder-schema` is now 1.x: update the two together. Coming from 0.x, every change on the way to 1.0 and how to update is in https://whatsaaaa.github.io/form-builder/guide/migrating-to-1.0.

### Patch Changes

- Updated dependencies [[`437962d`](https://github.com/whatsaaaa/form-builder/commit/437962da55433b2cde556580e85252b55f2e3325)]:
  - @whatsaaaa/form-builder-schema@1.0.0-rc.0

## 0.5.1

### Patch Changes

- [#53](https://github.com/whatsaaaa/form-builder/pull/53) [`ee418eb`](https://github.com/whatsaaaa/form-builder/commit/ee418eb20f12aab4c1956166f67e90d691f5f473) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - The `homepage` of each package points at its page on the docs site, https://whatsaaaa.github.io/form-builder/, instead of the repository.
- Updated dependencies [[`ee418eb`](https://github.com/whatsaaaa/form-builder/commit/ee418eb20f12aab4c1956166f67e90d691f5f473)]:
  - @whatsaaaa/form-builder-schema@0.17.1

## 0.5.0

### Minor Changes

- [#50](https://github.com/whatsaaaa/form-builder/pull/50) [`9e5431b`](https://github.com/whatsaaaa/form-builder/commit/9e5431bc9b8687bc8d4d27ab8872117b07e059a0) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - `@whatsaaaa/form-builder-schema` is a peer dependency now, not a dependency, so the adapter uses the copy your app installs instead of a second one of its own. With two copies, a builder from your `createSchemaBuilder()` threw in `useJsonForm`, and `instanceof DefinitionError` was `false` for the adapter's errors. The other peers now ask for what the adapter needs: Valibot 1.4.1 or later, like every `@formisch/vue` 1.x, and Vue 3.5.2 or later, the first Vue its published types check with when `skipLibCheck` is off.

## 0.4.0

### Minor Changes

- [#49](https://github.com/whatsaaaa/form-builder/pull/49) [`b096dbd`](https://github.com/whatsaaaa/form-builder/commit/b096dbdec3bd9e3033a72d4b14e01cd36255971f) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - The schema types it re-exports follow the schema package's renames: `JsonFormSchema` is now `BuiltSchema`, and `TypedJsonFormSchema` is now `TypedBuiltSchema`.

### Patch Changes

- Updated dependencies [[`b096dbd`](https://github.com/whatsaaaa/form-builder/commit/b096dbdec3bd9e3033a72d4b14e01cd36255971f)]:
  - @whatsaaaa/form-builder-schema@0.17.0

## 0.3.3

### Patch Changes

- Updated dependencies [[`4dcacd6`](https://github.com/whatsaaaa/form-builder/commit/4dcacd68d32e614236581125bed3f158685feaa5)]:
  - @whatsaaaa/form-builder-schema@0.16.0

## 0.3.2

### Patch Changes

- [#45](https://github.com/whatsaaaa/form-builder/pull/45) [`43d34b5`](https://github.com/whatsaaaa/form-builder/commit/43d34b5fae8e8fc10993bf871708e7bc1e2fdbda) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - The README links to the guide and the API reference on the docs site, https://whatsaaaa.github.io/form-builder/, which replaces the guides in `docs/` in the repository.
- Updated dependencies [[`43d34b5`](https://github.com/whatsaaaa/form-builder/commit/43d34b5fae8e8fc10993bf871708e7bc1e2fdbda)]:
  - @whatsaaaa/form-builder-schema@0.15.2

## 0.3.1

### Patch Changes

- [#41](https://github.com/whatsaaaa/form-builder/pull/41) [`e4a21b4`](https://github.com/whatsaaaa/form-builder/commit/e4a21b42ba6a12e8c5263b23b19cfcc91dac7ae5) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - A shorter README, with badges for the version, downloads, CI and coverage. The full guide moved to `docs/guide.md` in the repository, linked from the README.
- Updated dependencies [[`e4a21b4`](https://github.com/whatsaaaa/form-builder/commit/e4a21b42ba6a12e8c5263b23b19cfcc91dac7ae5)]:
  - @whatsaaaa/form-builder-schema@0.15.1

## 0.3.0

### Minor Changes

- [#38](https://github.com/whatsaaaa/form-builder/pull/38) [`76eba28`](https://github.com/whatsaaaa/form-builder/commit/76eba28572eb58ea2d1b6eacef2a960f0771a355) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - Conditions: with a builder that has extensions, like `createSchemaBuilder({ extensions: [affects()] })`, `<JsonFields>` and `<JsonField>` leave out the fields, sections, rows and groups the conditions hide, `steps.list` leaves out the steps whose fields are all hidden, and Next and Back skip them. `useJsonForm` sets the fields `hideAndClear` clears blank with Formisch's `setInput`, wherever they render, and `jsonForm.visibility` is the state for your own renderers. Without conditions, nothing changes.

  Fixed: a Next button that turns into the submit button on the last step no longer submits the form as the user gets there, which showed the last step's errors at once in a browser.

### Patch Changes

- Updated dependencies [[`76eba28`](https://github.com/whatsaaaa/form-builder/commit/76eba28572eb58ea2d1b6eacef2a960f0771a355)]:
  - @whatsaaaa/form-builder-schema@0.15.0

## 0.2.0

### Minor Changes

- [#36](https://github.com/whatsaaaa/form-builder/pull/36) [`f65a34d`](https://github.com/whatsaaaa/form-builder/commit/f65a34d93c5b36fabfbf804eb14104558377922b) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - `<JsonFields>` renders the definition's `layout`: its current step, with your components for sections and rows from the new `layoutComponents` option, and named slots for its slots. `jsonForm.steps` moves through the steps: Next validates the whole form and stays on issues of the current step, a step shows the errors it had when the user left it, a step that failed Next revalidates as the user fixes it, and a submit before the last step moves on like Next. `jsonForm.layout` is the resolved layout, and `<JsonFields :step>` renders a given step. Definitions without a `layout` render as before.

### Patch Changes

- Updated dependencies [[`f65a34d`](https://github.com/whatsaaaa/form-builder/commit/f65a34d93c5b36fabfbf804eb14104558377922b)]:
  - @whatsaaaa/form-builder-schema@0.14.0

## 0.1.5

### Patch Changes

- [#29](https://github.com/whatsaaaa/form-builder/pull/29) [`84e9a90`](https://github.com/whatsaaaa/form-builder/commit/84e9a90831602a875cb7f6f511f365e0f7558edc) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - `only`, `except` and the check for missing components now use the schema package's `selectFields` and `checkComponents`, which the React adapter shares. They behave as before.

  `<JsonFields>` with `only` no longer gives two fields the same key when they share a name at different depths, like `email` and `billing.email`.

- Updated dependencies [[`84e9a90`](https://github.com/whatsaaaa/form-builder/commit/84e9a90831602a875cb7f6f511f365e0f7558edc)]:
  - @whatsaaaa/form-builder-schema@0.13.0

## 0.1.4

### Patch Changes

- Updated dependencies [[`ee8019d`](https://github.com/whatsaaaa/form-builder/commit/ee8019dd1a07fc0236629289a76fd4db8f0b9e95)]:
  - @whatsaaaa/form-builder-schema@0.12.0

## 0.1.3

### Patch Changes

- [#25](https://github.com/whatsaaaa/form-builder/pull/25) [`2975556`](https://github.com/whatsaaaa/form-builder/commit/29755564f3acf08594f69e2057b746d3fd60cdcb) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - The adapter now uses the render helpers of `@whatsaaaa/form-builder-schema`, so it behaves as before, and renderers for other frameworks share its code. `FieldNode`, `FieldRole`, `FieldPath`, `JsonFormSchema` and `TypedJsonFormSchema` are the schema package's types, exported from here as before.
- Updated dependencies [[`2975556`](https://github.com/whatsaaaa/form-builder/commit/29755564f3acf08594f69e2057b746d3fd60cdcb)]:
  - @whatsaaaa/form-builder-schema@0.11.0

## 0.1.2

### Patch Changes

- Updated dependencies [[`4237cef`](https://github.com/whatsaaaa/form-builder/commit/4237cef3b8010fe45a1ea49a1c12ab4f7a890259)]:
  - @whatsaaaa/form-builder-schema@0.10.0

## 0.1.1

### Patch Changes

- [#21](https://github.com/whatsaaaa/form-builder/pull/21) [`804c24f`](https://github.com/whatsaaaa/form-builder/commit/804c24f13bc7981941312017703f6df3653f6e27) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - Add an npm version badge to the README.

## 0.1.0

### Minor Changes

- [#19](https://github.com/whatsaaaa/form-builder/pull/19) [`8384dd2`](https://github.com/whatsaaaa/form-builder/commit/8384dd25d7802355a8b110a928f2717e680e7205) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - First release: a headless Vue adapter. Pass a JSON definition and a component per field type, and get a working Formisch form.

  ```vue
  <script setup lang="ts">
  import { Form } from '@formisch/vue'
  import { JsonFields, useJsonForm } from '@whatsaaaa/form-builder-vue'

  const jsonForm = useJsonForm(definition, { components })
  </script>

  <template>
    <Form :of="jsonForm.form" @submit="save">
      <JsonFields :of="jsonForm" />
      <button type="submit">Save</button>
    </Form>
  </template>
  ```

  - `useJsonForm` builds the schema and the initial input with the builder, and creates the Formisch form.
  - `<JsonFields>` renders every field with your component for its type: value fields, groups, arrays with add, remove and move, and display elements, your own container types included.
  - `setInput` turns `'5'` into `5` for a number field, and a `FileList` into a file or an array of files.
  - `<JsonField path="…">` places one field, group or array anywhere in the form, and `except` and `only` on `<JsonFields>` leave fields out or pick them.
  - `useJsonForm<Input, Output>()` types the form with your own types, so Formisch's `<Field>`, `useField` and `getInput` check nested paths and values.
  - A missing component throws a `TypeError` that names every type without one.

### Patch Changes

- Updated dependencies [[`8384dd2`](https://github.com/whatsaaaa/form-builder/commit/8384dd25d7802355a8b110a928f2717e680e7205)]:
  - @whatsaaaa/form-builder-schema@0.9.0
