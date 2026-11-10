# @whatsaaaa/form-builder-react

Render JSON form definitions with [Formisch](https://formisch.dev) and your own React components.

[![npm version](https://img.shields.io/npm/v/@whatsaaaa/form-builder-react)](https://www.npmjs.com/package/@whatsaaaa/form-builder-react)
[![npm downloads](https://img.shields.io/npm/dm/@whatsaaaa/form-builder-react)](https://www.npmjs.com/package/@whatsaaaa/form-builder-react)
[![CI](https://img.shields.io/github/actions/workflow/status/whatsaaaa/form-builder/ci.yml?branch=main&label=CI)](https://github.com/whatsaaaa/form-builder/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/whatsaaaa/form-builder/graph/badge.svg?flag=react)](https://codecov.io/gh/whatsaaaa/form-builder)
[![React](https://img.shields.io/npm/dependency-version/@whatsaaaa/form-builder-react/peer/react?logo=react)](https://react.dev)
[![Types](https://img.shields.io/npm/types/@whatsaaaa/form-builder-react)](https://www.npmjs.com/package/@whatsaaaa/form-builder-react)
[![License](https://img.shields.io/npm/l/@whatsaaaa/form-builder-react)](https://github.com/whatsaaaa/form-builder/blob/main/LICENSE)

This is the React adapter of [form-builder](https://github.com/whatsaaaa/form-builder). It is headless: it reads the definition, connects every field to Formisch and turns input into the values the schema expects, but renders nothing of its own. You give it a component per field type, so it works with plain HTML, shadcn/ui or any other UI library.

## Install

```sh
pnpm add @whatsaaaa/form-builder-react @formisch/react valibot
```

React 18 or 19, `@formisch/react` 1.2 and Valibot 1.4.1 or later are required. `@whatsaaaa/form-builder-schema` comes with it.

## Example

```tsx
import { Form } from '@formisch/react'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { JsonFields, useJsonForm } from '@whatsaaaa/form-builder-react'
import { components } from './fields'

export function DefinitionForm({ definition }: { definition: JsonForm }) {
  const jsonForm = useJsonForm(definition, { components })

  function save(output: unknown) {
    // The output of the schema: trimmed, numbers as numbers, empty optional fields left out.
  }

  return (
    <Form of={jsonForm.form} onSubmit={save}>
      <JsonFields of={jsonForm} />
      <button type="submit">Save</button>
    </Form>
  )
}
```

`components` maps each field type to a component of yours. A text input looks like this:

```tsx
import type { ValueFieldProps } from '@whatsaaaa/form-builder-react'

export function TextInput({ field, kind, input, errors, inputProps, ...props }: ValueFieldProps) {
  return (
    <label>
      {field.label}
      <input
        {...inputProps}
        type={kind === 'number' ? 'number' : 'text'}
        value={String(input ?? '')}
        required={props.required}
        onChange={(e) => props.setInput(e.target.value)}
      />
      {errors && <small>{errors[0]}</small>}
    </label>
  )
}
```

`jsonForm.form` is a normal Formisch form, so every Formisch method works on it.

## Highlights

- Headless: one component of yours per field type, and per layout type
- `setInput` turns what an element gives into the value the schema expects
- Groups, arrays and display elements, with stable keys for array items
- Sections, 12-column rows, slots and multi-step forms from the definition's layout
- Steps that validate on Next and only show errors the user has seen
- Conditions from the affects package, re-rendering only when what is hidden changes
- Fields placed in your own markup with `<JsonField>`, `only` and `except`

## Documentation

The [guide](https://github.com/whatsaaaa/form-builder/blob/main/frameworks/react/docs/guide.md) covers options, components for every role, layout, steps, conditions, placing fields yourself and typing the form.

## Related packages

- [`@whatsaaaa/form-builder-schema`](https://github.com/whatsaaaa/form-builder/tree/main/packages/schema): build Formisch-ready Valibot schemas from JSON definitions
- [`@whatsaaaa/form-builder-affects`](https://github.com/whatsaaaa/form-builder/tree/main/packages/affects): show, hide and clear fields by conditions
- [`@whatsaaaa/form-builder-vue`](https://github.com/whatsaaaa/form-builder/tree/main/frameworks/vue): the same adapter for Vue

## License

[MIT](https://github.com/whatsaaaa/form-builder/blob/main/LICENSE)
