# Contributing

Ideas, bug reports and pull requests are welcome. If you are not sure where to start, open an issue first.

## Getting started

You need Node.js and pnpm. If you don't have pnpm yet, `corepack enable` sets it up.

```sh
git clone https://github.com/whatsaaaa/form-builder.git
cd form-builder
pnpm install
pnpm dev # starts the playground
```

| Command           | What it does                                       |
| ----------------- | -------------------------------------------------- |
| `pnpm dev`        | Starts the playground against the live source      |
| `pnpm build`      | Builds every package in dependency order           |
| `pnpm test`       | Runs every test suite                              |
| `pnpm lint`       | Runs oxlint and ESLint                             |
| `pnpm type-check` | Type-checks every package                          |
| `pnpm changeset`  | Records a change to a package for the next release |

To work on one package, use `--filter`:

```sh
pnpm --filter @whatsaaaa/form-builder-schema test
```

## Before you open a pull request

- Run `pnpm lint`, `pnpm type-check` and `pnpm test`.
- Add a changeset with `pnpm changeset` if you changed a published package.

## Repository layout

```
packages/      the framework-agnostic core: schema and affects
frameworks/    thin adapters for Vue and React
apps/          the playground (a visual builder and a docs site are planned)
fixtures/      sample JSON forms every test suite shares
integration/   tests that run the fixtures through Formisch's own bindings, and the renderers the docs show
```

The JSON Schema of the definition format ships with the schema package as
[`definition.schema.json`](./packages/schema/definition.schema.json), and the one with conditions with the affects
package as [`definition.schema.json`](./packages/affects/definition.schema.json).

Dependencies only flow downhill:

```
apps  →  frameworks  →  packages
```

The core never imports a UI framework or Node built-ins, so it runs anywhere. ESLint enforces this.

## Inside a package

Every package follows the same layout. [`packages/schema`](./packages/schema) is the reference:

```
packages/schema/
├── src/
│   ├── index.ts                      the main entry: the public API
│   ├── json-schema.ts                the `/json-schema` entry, for code with an optional peer
│   ├── builder/                      one folder per feature
│   │   ├── create-schema-builder.ts
│   │   ├── validate-definition.ts
│   │   ├── build-field-schema.ts
│   │   └── registry.ts
│   ├── definition/                   the JSON format the package reads
│   ├── errors/
│   ├── extensions/                   what a feature from another package, like affects, plugs into
│   ├── field-types/
│   ├── json-schema/
│   ├── kinds/
│   ├── render/                       helpers for renderers in any framework
│   ├── rules/
│   ├── shared/                       small building blocks used by several features
│   └── visibility/                   what the conditions of extensions hide
└── tests/                            mirrors src/
    └── builder/
        ├── build.test.ts
        ├── extend.test.ts
        └── validate.test.ts
```

- **Features, not file kinds.** Folders are named after what the code does (`rules/`, `builder/`), never after what
  kind of file it is (`utils/`, `helpers/`, `types/`). A feature keeps its types next to its code.
- **One concept per file, named after it.** File names are `kebab-case` and match their main export:
  `buildFieldSchema` lives in `build-field-schema.ts`. If you can't name a file, it does too much.
- **Few doors in.** `src/index.ts` is the public API. Code that needs an optional peer dependency gets its own entry
  next to it instead, so the main one never loads the peer: `src/json-schema.ts` is
  `@whatsaaaa/form-builder-schema/json-schema`, because it needs `@valibot/to-json-schema`. Anything not exported from
  an entry is internal and free to change. Feature folders don't get their own `index.ts`, so imports always point at
  the real file.
- **Dependencies flow one way.** `shared` ← `errors`, `kinds`, `definition` ← `rules`, `field-types`, `render`,
  `extensions` ← `visibility` ← `builder` ← `index.ts`, and `definition`, `rules`, `field-types`, `extensions` ←
  `json-schema` ← `json-schema.ts`. Each package lists its features and what they may import in `packageFeatures` in
  [`eslint.config.ts`](./eslint.config.ts). Add a new feature folder there, and lint enforces the rest.
- **Tests live in `tests/`.** They mirror the `src/` tree, end in `.test.ts`, and import the package by its name
  (`@whatsaaaa/form-builder-schema`), so they use the same API your users do.
