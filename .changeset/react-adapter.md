---
'@whatsaaaa/form-builder-react': minor
---

First release: a headless React adapter. Pass a JSON definition and a component per field type, and get a working Formisch form.

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
