<h1 align="center">form-builder</h1>
<p align="center">
    Describe your forms in JSON. Get real, validated <a href="https://formisch.dev">Formisch</a> forms out.
</p>

<p align="center">
    <img src="https://img.shields.io/badge/pnpm-workspace-F69220?logo=pnpm&amp;logoColor=white" alt="pnpm workspace">
    <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&amp;logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/Vue-3-4FC08D?logo=vuedotjs&amp;logoColor=white" alt="Vue">
    <img src="https://img.shields.io/badge/validation-Valibot-0F172A" alt="Valibot">
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="License: MIT">
    <img src="https://img.shields.io/badge/status-early%20days-orange" alt="Status: early days">
</p>

<p align="center">
    <a href="#-whats-inside">Packages</a> ·
    <a href="#-getting-started">Getting started</a> ·
    <a href="#-how-it-fits-together">How it fits together</a> ·
    <a href="#-contributing">Contributing</a>
</p>

---

## 👋 Hey there

Forms are everywhere, and a lot of them don't really belong in your source code. Some live in a database because admins
edit them. Some come from an API. Some get dragged together in a visual editor.

**form-builder** lets you write a form down as plain JSON and hands you back a working Formisch form, with fields and
validation already wired up. The core doesn't care which framework you use: it works with Formisch's own package for
Vue, React, Preact, Solid, Svelte, Qwik or Angular. A small Vue adapter renders the fields with your components, and
adapters for the other frameworks are planned.

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

That's a signup form. No components written by hand, no validation duplicated across files. 🎉

## 📦 What's inside

This repo is a **pnpm workspace**. Everything lives together so the packages can grow side by side.

### Published packages

|     | Package                                               | What it does                                                                                                                 | Status |
| :-: | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | :----: |
| 🧩  | [`@whatsaaaa/form-builder-schema`](./packages/schema) | The heart of it all. Turns JSON definitions into Valibot schemas Formisch understands, with helpers to render them anywhere. |   🚧   |
| 💚  | [`@whatsaaaa/form-builder-vue`](./frameworks/vue)     | Pass it a definition and a component per field type, and you have a working form. Headless, so any UI library fits.          |   🚧   |
| 🔗  | `@whatsaaaa/form-builder-affects`                     | Lets fields react to each other: show this when that's checked, make it required, change the options, compute a value.       |   💭   |
| ⚙️  | `@whatsaaaa/form-builder-codegen`                     | A CLI that turns your JSON into fully typed TypeScript, for when you know the form at build time.                            |   💭   |

🚧 in progress · 💭 planned

Adapters for React, Preact, Solid, Svelte, Qwik and Angular are planned. They'll sit next to the Vue adapter in
`frameworks/`. Until then, the schema package works with Formisch's own package for any of them: see
[Using with Formisch](./packages/schema/README.md#using-with-formisch).

### Apps (private, never published)

|     | App               | What it's for                                                           | Status |
| :-: | ----------------- | ----------------------------------------------------------------------- | :----: |
| 🛝  | `apps/playground` | A Vite + Vue sandbox for poking at the packages while you work on them. |   🚧   |
| 🏗️  | `apps/builder`    | A visual form builder that spits out JSON definitions.                  |   💭   |
| 📚  | `apps/docs`       | A docs site.                                                            |   💭   |

## 🚀 Getting started

You'll need **Node.js** and **pnpm**. If you don't have pnpm yet, `corepack enable` sets it up.

```sh
git clone https://github.com/whatsaaaa/form-builder.git
cd form-builder
pnpm install
pnpm dev    # open the playground
```

That's it, you're in.

### Handy commands

| Command           |                                             |
| ----------------- | ------------------------------------------- |
| `pnpm dev`        | Starts the playground against live source   |
| `pnpm build`      | Builds every package in the right order     |
| `pnpm test`       | Runs all the tests                          |
| `pnpm lint`       | Checks code style                           |
| `pnpm type-check` | Makes TypeScript happy                      |
| `pnpm changeset`  | Notes down your change for the next release |

Want to work on just one package? Use `--filter`:

```sh
pnpm --filter @whatsaaaa/form-builder-schema test
```

## 🧭 How it fits together

```
📁 packages/     the framework-agnostic core
📁 frameworks/   thin adapters: Vue today, the other Formisch frameworks later
📁 apps/         the playground (a builder and docs are planned)
📁 fixtures/     sample JSON forms every test suite shares
📁 integration/  tests that run the fixtures through Formisch's own bindings
```

The JSON Schema for the definition format (editor autocomplete!) ships with the schema package as
[`packages/schema/definition.schema.json`](./packages/schema/definition.schema.json).

There's one rule to keep things tidy. **Dependencies only flow downhill:**

```
apps  →  frameworks  →  packages
```

The core never imports Vue or Node built-ins, so it runs anywhere. ESLint will gently remind you if you forget.

### Inside a package

Every package follows the same layout, so once you know one you know them all.
[`packages/schema`](./packages/schema) is the reference:

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
│   ├── field-types/
│   ├── json-schema/
│   ├── kinds/
│   ├── render/                       helpers for renderers in any framework
│   ├── rules/
│   └── shared/                       small building blocks used by several features
└── tests/                            mirrors src/
    └── builder/
        ├── build.test.ts
        ├── extend.test.ts
        └── validate.test.ts
```

- 📁 **Features, not file kinds.** Folders are named after what the code does (`rules/`, `builder/`), never after
  what kind of file it is (`utils/`, `helpers/`, `types/`). A feature keeps its types next to its code.
- 📄 **One concept per file, named after it.** File names are `kebab-case` and match their main export:
  `buildFieldSchema` lives in `build-field-schema.ts`. If you can't name a file, it does too much.
- 🚪 **Few doors in.** `src/index.ts` is the public API. Code that needs an optional peer dependency gets its own
  entry next to it instead, so the main one never loads the peer: `src/json-schema.ts` is
  `@whatsaaaa/form-builder-schema/json-schema`, because it needs `@valibot/to-json-schema`. Anything not exported from
  an entry is internal and free to change. Feature folders don't get their own `index.ts`, so imports always point at
  the real file.
- ⬇️ **Dependencies flow one way.** `shared` ← `errors`, `kinds`, `definition` ← `rules`, `field-types`, `render` ←
  `builder` ← `index.ts`, and `rules`, `field-types` ← `json-schema` ← `json-schema.ts`.
  Each package lists its features and what they may import in `packageFeatures` in
  [`eslint.config.ts`](./eslint.config.ts). Add a new feature folder there, and lint will enforce the rest.
- 🧪 **Tests live in `tests/`.** They mirror the `src/` tree, end in `.test.ts`, and import the package by its name
  (`@whatsaaaa/form-builder-schema`), so they use the same API your users do.

## 🌱 Status

Early days! The JSON → Valibot builder is working, and everything else is on its way. Expect the API and the JSON format to change between `0.x` releases.

## 🤝 Contributing

Ideas, bug reports and PRs are all very welcome. Before opening a PR:

- ✅ run `pnpm lint`, `pnpm type-check` and `pnpm test`
- 📝 add a changeset if you touched a published package

Not sure where to start? Open an issue and say hi.

## 📄 License

[MIT](./LICENSE). Use it, fork it, build cool things with it.

Built on top of [Formisch](https://formisch.dev) and [Valibot](https://valibot.dev)
