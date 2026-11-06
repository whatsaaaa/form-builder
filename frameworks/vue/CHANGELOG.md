# @whatsaaaa/form-builder-vue

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
