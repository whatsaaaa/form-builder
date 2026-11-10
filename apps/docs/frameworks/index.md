---
description: Which packages to use to render form definitions in Vue, React, Preact, Solid, Svelte, Qwik and Angular.
---

# Choose your framework

The schema package builds a Valibot schema that works with Formisch's own package for every framework. How you render the fields depends on yours. Below you will learn which packages to use.

## Vue and React

Vue and React have an adapter: [`@whatsaaaa/form-builder-vue`](/frameworks/vue) and [`@whatsaaaa/form-builder-react`](/frameworks/react). It builds the Formisch form, connects every field to it, and renders each field with a component of yours, by its type. It also renders the layout's sections, rows and steps with your components, and hides what conditions hide.

The adapters are headless, so they work with plain HTML, Nuxt UI, shadcn/ui or any other UI library. The form is a normal Formisch form, so every Formisch method works on it.

| Framework | Packages                                                                             |
| --------- | ------------------------------------------------------------------------------------ |
| Vue       | `@whatsaaaa/form-builder-vue`, `@whatsaaaa/form-builder-schema`, `@formisch/vue`     |
| React     | `@whatsaaaa/form-builder-react`, `@whatsaaaa/form-builder-schema`, `@formisch/react` |

## Other frameworks

Preact, Solid, Svelte, Qwik and Angular need no adapter. You use the schema package with Formisch's own package for your framework, and render the fields yourself. The schema package gives you everything a renderer needs: the schema and initial input for Formisch, the layout with every reference resolved, and helpers for paths, values and steps.

You don't start from nothing: each framework has a whole renderer, with layouts, steps, conditions and a control for every built-in type, and tests run every shared fixture through it. Copy it into your app and make it yours.

| Framework | Packages                                              | Renderer                       |
| --------- | ----------------------------------------------------- | ------------------------------ |
| Preact    | `@whatsaaaa/form-builder-schema`, `@formisch/preact`  | [Preact](/frameworks/preact)   |
| Solid     | `@whatsaaaa/form-builder-schema`, `@formisch/solid`   | [Solid](/frameworks/solid)     |
| Svelte    | `@whatsaaaa/form-builder-schema`, `@formisch/svelte`  | [Svelte](/frameworks/svelte)   |
| Qwik      | `@whatsaaaa/form-builder-schema`, `@formisch/qwik`    | [Qwik](/frameworks/qwik)       |
| Angular   | `@whatsaaaa/form-builder-schema`, `@formisch/angular` | [Angular](/frameworks/angular) |

[Rendering with Formisch](/frameworks/formisch) explains how these renderers work, if you want to write your own, in any framework.

## Without a UI

The schema is a plain Valibot schema, so it also validates on a server, with `v.parse` or `v.safeParse`, against the same definition the form renders. Conditions hide fields there too. See [validating on the server](/guide/server-validation).
