---
description: What semantic versioning covers in each package, how deprecations work, and where the adapters depend on parts of Formisch outside its own semver.
---

# Stability

From 1.0, the schema, Vue and React packages follow [semantic versioning](https://semver.org): a patch fixes bugs, a minor adds, and only a major breaks. Below you will learn what counts as the public API, what doesn't, and how a change that breaks reaches you.

## Packages

- **`@whatsaaaa/form-builder-schema`, `@whatsaaaa/form-builder-vue` and `@whatsaaaa/form-builder-react`** are 1.x, and follow semantic versioning as this page describes.
- **`@whatsaaaa/form-builder-affects`** stays before 1.0: a minor can break, a patch can't. It goes 1.0 once its conditions have settled.

The affects package plugs into the schema package's [extension contract](/guide/extensions#how-the-contract-grows), which is part of the schema package's 1.x API. So the affects package can change on its own, while extensions you write keep working with every schema 1.x.

## What the API is

These only change in a way that breaks in a major release:

- **The JSON format.** A definition that works keeps working, with the same meaning. See [format version](/guide/format-version).
- **The exports** of each package's entries, like `@whatsaaaa/form-builder-schema` and `@whatsaaaa/form-builder-schema/json-schema`: their names, their parameters and what they do, as the docs describe.
- **The types** of those exports. A minor can make a type more precise when it was wrong, and the changelog says so.
- **Issue codes and paths** that `validate()` reports. A minor can add a code. See [codes are API](/guide/checking-definitions#codes-are-api-messages-are-not).
- **The reserved names**: field keys, layout node types, and the keys of rules and form rules. They only grow in a major. See [reserved keys](/api/schema/reserved-keys).
- **The extension contract**, `SchemaExtension` and the types around it. A minor only adds to it, in the ways [extensions](/guide/extensions#how-the-contract-grows) lists.
- **The shape of the schema** `build()` gives: its type, the keys of each field, and what Formisch reads from it.
- **The supported versions** of the peers and of TypeScript. Dropping one is a major change. A Node release line can be dropped in a minor once it reaches its end of life, and the changelog says so. See [supported versions](/guide/support).

## What isn't

These can change in any release:

- **Message text.** The messages of issues, of definitions and of errors in your code can change, and part of them comes from Valibot. Show them, but don't parse them. Your own messages, from the definition, `messages` and `resolveMessage`, are always used as you wrote them.
- **Anything not exported** from an entry, like a file under `dist/`. Import only from the package's name and its documented entries.
- **The inside of the schema**: the actions in its pipes and the order they run in, as long as the issues and the output stay the same.
- **Behavior the docs call a bug**, and behavior that contradicts the docs. A fix of either is a patch, and the changelog says what changed.

## The adapters and Formisch

The Vue and React adapters render with Formisch, and read some parts of it that Formisch keeps out of its public API, and so out of its own semantic versioning:

- Both read the `<form>` element that Formisch's `<Form>` keeps on the form store, `form['~internal'].element`, to submit a step.
- The React adapter imports `@formisch/react/internals`: `INTERNAL`, `getFieldInput`, `setListener` and `untrack`, to watch the form's input for conditions.

So a minor or a patch of Formisch could break an adapter, inside the peer range it allows. Every pull request, and a job every day, runs the adapters against the latest Formisch, Valibot, Vue and React, so a break shows up before you meet it. A fix ships as a patch of the adapter, which may then need that Formisch release or a later one. The [Formisch bindings](/frameworks/formisch) without an adapter only use Formisch's public API.

## Deprecations

Before a major removes or changes something, a minor deprecates it:

- The export gets `@deprecated` in its JSDoc, so your editor strikes it through, and its page and the changelog say what to use instead.
- It keeps working the same until the next major removes it.
- Each major has a migration guide, like [migrating to 1.0](/guide/migrating-to-1.0).

## Releases

- Fixes land in the latest 1.x release. Older minors get no backports, so update within 1.x to get a fix.
- A release candidate, like `1.0.0-rc.0`, is published under the npm tag `rc`, so `npm install` doesn't pick it. It can still change before the final release.
- Each package's changelog lists every change, with the kind of release it needs.
