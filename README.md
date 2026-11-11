# form-builder

Describe forms in JSON and get validated [Formisch](https://formisch.dev) forms out.

[![CI](https://img.shields.io/github/actions/workflow/status/whatsaaaa/form-builder/ci.yml?branch=main&label=CI)](https://github.com/whatsaaaa/form-builder/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/whatsaaaa/form-builder/graph/badge.svg)](https://codecov.io/gh/whatsaaaa/form-builder)
[![License](https://img.shields.io/github/license/whatsaaaa/form-builder)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Valibot](https://img.shields.io/badge/Valibot-1.x-0F172A)](https://valibot.dev)
[![Vue](https://img.shields.io/badge/Vue-3-4FC08D?logo=vuedotjs&logoColor=white)](./frameworks/vue)
[![React](https://img.shields.io/badge/React-18%20%7C%2019-61DAFB?logo=react&logoColor=black)](./frameworks/react)

**[Documentation](https://whatsaaaa.github.io/form-builder/)**

form-builder turns a JSON form definition into a [Valibot](https://valibot.dev) schema that Formisch understands, with the fields, validation, layout and conditions it describes. It is meant for forms that don't belong in your source code: forms stored in a database, served by an API or put together in a visual editor. The core is framework-agnostic and works with Formisch's own package for Vue, React, Preact, Solid, Svelte, Qwik and Angular. Headless adapters for Vue and React render the fields with your own components.

## Example

A signup form, as a definition:

```json
{
  "version": "1",
  "fields": [
    { "name": "email", "type": "email", "required": true },
    {
      "name": "password",
      "type": "password",
      "required": true,
      "rules": [{ "rule": "minLength", "value": 8 }]
    }
  ]
}
```

The schema package builds it into a schema for Formisch, or for a plain `v.parse`:

```ts
import { createSchemaBuilder } from '@whatsaaaa/form-builder-schema'

const builder = createSchemaBuilder()
const schema = builder.build(json)
```

## Highlights

- Every native control as a field type, plus groups, arrays and display elements
- Every Valibot action that fits in JSON as a validation rule, and form rules across fields
- Sections, a 12-column grid and multi-step forms, described in the definition
- Fields, sections and steps that show, hide and clear by the values of other fields
- Definitions checked with precise issues, and a JSON Schema for editor autocompletion
- Your own field types, rules and messages, with i18n through Valibot

## Packages

| Package                                                 | Description                                                            |
| ------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`@whatsaaaa/form-builder-schema`](./packages/schema)   | Builds Formisch-ready Valibot schemas from JSON definitions. The core. |
| [`@whatsaaaa/form-builder-affects`](./packages/affects) | Conditions that show, hide and clear fields, sections and steps.       |
| [`@whatsaaaa/form-builder-vue`](./frameworks/vue)       | Renders definitions with Formisch and your own Vue components.         |
| [`@whatsaaaa/form-builder-react`](./frameworks/react)   | Renders definitions with Formisch and your own React components.       |

Preact, Solid, Svelte, Qwik and Angular need no adapter. The schema package works with Formisch's own package for each, and [the docs](https://whatsaaaa.github.io/form-builder/frameworks/) have a tested renderer for each to start from.

Planned: `@whatsaaaa/form-builder-codegen`, a CLI that turns definitions into typed TypeScript, and a visual builder that writes definitions.

## Status

The schema, Vue and React packages follow semantic versioning from 1.0: the JSON format, the exports, and the codes and paths of issues only break in a major release. The affects package stays before 1.0 for now. See [stability](https://whatsaaaa.github.io/form-builder/guide/stability), [supported versions](https://whatsaaaa.github.io/form-builder/guide/support), and [migrating to 1.0](https://whatsaaaa.github.io/form-builder/guide/migrating-to-1.0).

1.0 is in release candidates on the `rc` dist-tag, while a plain install still gives 0.x. To try it, add `@rc` to each form-builder package you install, for example `pnpm add @whatsaaaa/form-builder-schema@rc @whatsaaaa/form-builder-vue@rc`.

## Contributing

Bug reports, ideas and pull requests are welcome. [CONTRIBUTING.md](./CONTRIBUTING.md) explains how to set up the repository, the commands, and how the packages are laid out.

## License

[MIT](./LICENSE). Built on [Formisch](https://formisch.dev) and [Valibot](https://valibot.dev).
