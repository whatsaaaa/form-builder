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
validation already wired up. The core doesn't care which framework you use. Small adapters handle the Vue, React or 
Angular part on top of it.

```json
{
  "version": 1,
  "fields": [
    { "name": "email", "type": "email", "required": true },
    { "name": "password", "type": "password", "required": true, "rules": [{ "name": "minLength", "params": [8] }] }
  ]
}
```

That's a signup form. No components written by hand, no validation duplicated across files. 🎉

## 📦 What's inside

This repo is a **pnpm workspace**. Everything lives together so the packages can grow side by side.

### Published packages

| | Package | What it does | Status |
| :-: | --- | --- | :-: |
| 🧩 | [`@whatsaaaa/form-builder-schema`](./packages/schema) | The heart of it all. Reads and validates JSON definitions and turns them into Valibot schemas Formisch understands. | 🚧 |
| 🔗 | [`@whatsaaaa/form-builder-affects`](./packages/affects) | Lets fields react to each other: show this when that's checked, make it required, change the options, compute a value. | 💭 |
| ⚙️ | [`@whatsaaaa/form-builder-codegen`](./packages/codegen) | A CLI that turns your JSON into fully typed TypeScript, for when you know the form at build time. | 💭 |
| 💚 | [`@whatsaaaa/form-builder-vue`](./frameworks/vue) | Drop in `<JsonForm>`, pass it a definition, and you have a rendered form. | 💭 |
 
🚧 in progress · 💭 planned

React, Angular and friends will sit next to the Vue adapter in `frameworks/` once the core settles down.

### Apps (private, never published)

| | App | What it's for |
| :-: | --- | --- |
| 🛝 | `apps/playground` | A Vite + Vue sandbox for poking at the packages while you work on them. |
| 🏗️ | `apps/builder` | A visual form builder that spits out JSON definitions. |

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

| Command | |
| --- | --- |
| `pnpm dev` | Starts the playground against live source |
| `pnpm build` | Builds every package in the right order |
| `pnpm test` | Runs all the tests |
| `pnpm lint` | Checks code style |
| `pnpm typecheck` | Makes TypeScript happy |
| `pnpm changeset` | Notes down your change for the next release |

Want to work on just one package? Use `--filter`:

```sh
pnpm --filter @whatsaaaa/form-builder-schema test
```

## 🧭 How it fits together

```
📁 packages/     the framework-agnostic core
📁 frameworks/   thin adapters for Vue (and later React, Angular…)
📁 apps/         playground, builder, docs
📁 fixtures/     sample JSON forms every test suite shares
📁 schema/       JSON Schema for the definition format (editor autocomplete!)
```

There's one rule to keep things tidy. **Dependencies only flow downhill:**

```
apps  →  frameworks  →  packages
```

The core never imports Vue or Node built-ins, so it runs anywhere. ESLint will gently remind you if you forget.


## 🌱 Status
 
Early days! The JSON → Valibot builder is working, and everything else is on its way. Expect the API and the JSON format to change between `0.x` releases.

## 🤝 Contributing
 
Ideas, bug reports and PRs are all very welcome. Before opening a PR:
 
- ✅ run `pnpm lint`, `pnpm typecheck` and `pnpm test`
- 📝 add a changeset if you touched a published package

Not sure where to start? Open an issue and say hi.
 
## 📄 License
 
[MIT](./LICENSE). Use it, fork it, build cool things with it.


Built on top of [Formisch](https://formisch.dev) and [Valibot](https://valibot.dev)
