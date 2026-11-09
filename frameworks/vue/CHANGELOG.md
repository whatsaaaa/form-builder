# @whatsaaaa/form-builder-vue

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
