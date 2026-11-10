---
description: The versions of Valibot, Formisch, Vue, React, TypeScript, Node and browsers each package supports, and how CI tests them.
---

# Supported versions

Below you will find the versions of the peers and the platforms each package supports. CI tests the lowest version of each, and the latest every day, so the ranges are measured, not guessed.

## Peers

| Package | Peers                                                                                     |
| ------- | ----------------------------------------------------------------------------------------- |
| Schema  | `valibot` 1.3.0+, and `@valibot/to-json-schema` 1.6.0+ for the `/json-schema` entry only  |
| Affects | `valibot` 1.3.0+, the schema package 1.x                                                  |
| Vue     | `vue` 3.5.2+, `@formisch/vue` 1.1.1+, `valibot` 1.4.1+, the schema package 1.x            |
| React   | `react` 18.0.0+ or 19, `@formisch/react` 1.2.0+, `valibot` 1.4.1+, the schema package 1.x |

- `@valibot/to-json-schema` is optional. Its 1.8 and later need Valibot 1.5 or later.
- Every Formisch package needs Valibot 1.4.1 or later, so with Formisch, that is the lowest Valibot. The schema package alone, for example on a server, works with 1.3.0.
- Each range ends below the peer's next major. A new major of a peer is supported in a release of ours, once it is tested.
- Vue 3.5.2 is the first whose types the Vue adapter's published types check with, when `skipLibCheck` is off.

The Vue and React adapters read some parts of Formisch outside its public API. See [the adapters and Formisch](/guide/stability#the-adapters-and-formisch).

## Formisch bindings

With no adapter, the schema package works with Formisch's own package for each framework. The [tested renderers](/frameworks/formisch) run in CI with these, and with the latest of each every day:

| Binding             | Tested from |
| ------------------- | ----------- |
| `@formisch/preact`  | 1.3.0       |
| `@formisch/solid`   | 1.3.0       |
| `@formisch/svelte`  | 1.2.0       |
| `@formisch/qwik`    | 1.3.0       |
| `@formisch/angular` | 1.2.0       |

## TypeScript

TypeScript 5.3 or later, with `strict` on. Older versions reject the keys of extensions, like `affects`, in a definition written with [`defineForm()`](/guide/typescript). CI checks the published types with TypeScript 5.3 and the latest, with `strict` on, `skipLibCheck` off and `moduleResolution` set to `nodenext`.

## Node

Node 20.19 or later, to `import` the packages, to parse on a server and to render there.

- The packages are ES modules only. Node 20.19 and later can also `require()` them from CommonJS, without a flag.
- CI runs the schema and affects tests on Node 22 and 24, and a project that installs the packed packages on Node 20.19 and 24, with an import, a server render with each adapter, and a `require()`.
- Both adapters render on the server, with `react-dom/server` and `vue/server-renderer`. See [validating on the server](/guide/server-validation).

## Browsers

The packages use ES2022, like `Object.hasOwn` and `Array.prototype.at`, and aren't compiled down: Chrome 93, Firefox 92 and Safari 15.4 or later. To support older browsers, have your bundler compile them, and add the polyfills.

## Changes

A peer's new major, a new TypeScript or a new Node is supported in a minor or a patch. Dropping a peer version or a TypeScript version is a major change. A Node release line can be dropped in a minor once it reaches its end of life. See [stability](/guide/stability).
