# @whatsaaaa/form-builder-react

## 0.3.0

### Minor Changes

- [#38](https://github.com/whatsaaaa/form-builder/pull/38) [`76eba28`](https://github.com/whatsaaaa/form-builder/commit/76eba28572eb58ea2d1b6eacef2a960f0771a355) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - Conditions: with a builder that has extensions, like `createSchemaBuilder({ extensions: [affects()] })`, `<JsonFields>` and `<JsonField>` leave out the fields, sections, rows and groups the conditions hide, `steps.list` leaves out the steps whose fields are all hidden, and Next and Back skip them. `useJsonForm` sets the fields `hideAndClear` clears blank with Formisch's `setInput`, wherever they render, and `jsonForm.visibility` is the state for your own renderers. The form renders again only when what is hidden changes, not on every keystroke. Without conditions, nothing changes.

  Fixed: a Next button that turns into the submit button on the last step no longer submits the form as the user gets there, which showed the last step's errors at once in a browser.

### Patch Changes

- Updated dependencies [[`76eba28`](https://github.com/whatsaaaa/form-builder/commit/76eba28572eb58ea2d1b6eacef2a960f0771a355)]:
  - @whatsaaaa/form-builder-schema@0.15.0

## 0.2.0

### Minor Changes

- [#36](https://github.com/whatsaaaa/form-builder/pull/36) [`f65a34d`](https://github.com/whatsaaaa/form-builder/commit/f65a34d93c5b36fabfbf804eb14104558377922b) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - `<JsonFields>` renders the definition's `layout`: its current step, with your components for sections and rows from the new `layoutComponents` option, and the `slots` prop for its slots. `jsonForm.steps` moves through the steps: Next validates the whole form and stays on issues of the current step, a step shows the errors it had when the user left it, a step that failed Next revalidates as the user fixes it, and a submit before the last step moves on like Next. `jsonForm.layout` is the resolved layout, and `<JsonFields step>` renders a given step. Definitions without a `layout` render as before.

### Patch Changes

- Updated dependencies [[`f65a34d`](https://github.com/whatsaaaa/form-builder/commit/f65a34d93c5b36fabfbf804eb14104558377922b)]:
  - @whatsaaaa/form-builder-schema@0.14.0

## 0.1.0

### Minor Changes

- [#29](https://github.com/whatsaaaa/form-builder/pull/29) [`6beaecf`](https://github.com/whatsaaaa/form-builder/commit/6beaecf0f40cbab44205df810cbd9ea974f4c82e) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - First release: a headless React adapter. Pass a JSON definition and a component per field type, and get a working Formisch form.

  ```tsx
  import { Form } from '@formisch/react'
  import { JsonFields, useJsonForm } from '@whatsaaaa/form-builder-react'

  function DefinitionForm({ definition }: { definition: JsonForm }) {
    const jsonForm = useJsonForm(definition, { components })
    return (
      <Form of={jsonForm.form} onSubmit={save}>
        <JsonFields of={jsonForm} />
        <button type="submit">Save</button>
      </Form>
    )
  }
  ```

  - `useJsonForm` builds the schema and the initial input with the builder, and creates the Formisch form. Like Formisch's `useForm`, it reads the definition on the first render.
  - `<JsonFields>` renders every field with your component for its type: value fields, groups with their fields as `children`, arrays with add, remove and move and `children(index)` for each item, and display elements, your own container types included.
  - `setInput` turns `'5'` into `5` for a number field, and a `FileList` into a file or an array of files.
  - `<JsonField path="…">` places one field, group or array anywhere in the form, and `except` and `only` on `<JsonFields>` leave fields out or pick them.
  - `useJsonForm<Input, Output>()` types the form with your own types, so Formisch's `<Field>`, `useField` and `getInput` check nested paths and values.
  - A missing component throws a `TypeError` that names every type without one.
  - Works with React 18 and 19.

### Patch Changes

- Updated dependencies [[`84e9a90`](https://github.com/whatsaaaa/form-builder/commit/84e9a90831602a875cb7f6f511f365e0f7558edc)]:
  - @whatsaaaa/form-builder-schema@0.13.0
