---
description: How to add form-builder to your project, for Vue, React or any other framework.
---

# Installation

Below you will learn how to add form-builder to your project. Which packages you need depends on your framework.

::: tip Release candidate
1.0 is in release candidates on the `rc` dist-tag, while a plain install still gives 0.x. To try it, add `@rc` to each form-builder package you install:

```sh
pnpm add @whatsaaaa/form-builder-schema@rc valibot
pnpm add @whatsaaaa/form-builder-vue@rc @formisch/vue   # Vue
pnpm add @whatsaaaa/form-builder-react@rc @formisch/react # React
pnpm add @whatsaaaa/form-builder-affects@rc             # Conditions
```

Read the [migration guide](/guide/migrating-to-1.0) and the [stability policy](/guide/stability) before you upgrade, and tell us how it goes in a [GitHub issue](https://github.com/whatsaaaa/form-builder/issues).
:::

## TypeScript

If you use TypeScript, enable strict mode in your `tsconfig.json`, so that every type is computed correctly.

```jsonc
{
  "compilerOptions": {
    "strict": true,
    // ...
  },
}
```

## Vue

The Vue adapter renders definitions with Formisch and your own components. Install it with the schema package, Formisch for Vue and Valibot:

::: code-group

```sh [npm]
npm install @whatsaaaa/form-builder-vue @whatsaaaa/form-builder-schema @formisch/vue valibot
```

```sh [pnpm]
pnpm add @whatsaaaa/form-builder-vue @whatsaaaa/form-builder-schema @formisch/vue valibot
```

```sh [yarn]
yarn add @whatsaaaa/form-builder-vue @whatsaaaa/form-builder-schema @formisch/vue valibot
```

```sh [bun]
bun add @whatsaaaa/form-builder-vue @whatsaaaa/form-builder-schema @formisch/vue valibot
```

:::

The [Vue page](/frameworks/vue#installation) lists the versions it requires.

## React

The React adapter does the same for React:

::: code-group

```sh [npm]
npm install @whatsaaaa/form-builder-react @whatsaaaa/form-builder-schema @formisch/react valibot
```

```sh [pnpm]
pnpm add @whatsaaaa/form-builder-react @whatsaaaa/form-builder-schema @formisch/react valibot
```

```sh [yarn]
yarn add @whatsaaaa/form-builder-react @whatsaaaa/form-builder-schema @formisch/react valibot
```

```sh [bun]
bun add @whatsaaaa/form-builder-react @whatsaaaa/form-builder-schema @formisch/react valibot
```

:::

The [React page](/frameworks/react#installation) lists the versions it requires.

## Other frameworks

Preact, Solid, Svelte, Qwik and Angular need no adapter. Install the schema package with Formisch's own package for your framework, here for Solid:

::: code-group

```sh [npm]
npm install @whatsaaaa/form-builder-schema @formisch/solid valibot
```

```sh [pnpm]
pnpm add @whatsaaaa/form-builder-schema @formisch/solid valibot
```

```sh [yarn]
yarn add @whatsaaaa/form-builder-schema @formisch/solid valibot
```

```sh [bun]
bun add @whatsaaaa/form-builder-schema @formisch/solid valibot
```

:::

The schema package needs Valibot 1.3 or later on its own, and every Formisch package needs 1.4.1 or later. [Supported versions](/guide/support) lists every range. The [Formisch bindings](/frameworks/formisch) have a tested renderer for each framework to start from.

## Conditions

To show and hide fields by the values of other fields, also add the affects package:

::: code-group

```sh [npm]
npm install @whatsaaaa/form-builder-affects
```

```sh [pnpm]
pnpm add @whatsaaaa/form-builder-affects
```

```sh [yarn]
yarn add @whatsaaaa/form-builder-affects
```

```sh [bun]
bun add @whatsaaaa/form-builder-affects
```

:::

## JSON Schema

To make a JSON Schema for your own field types and rules, also add `@valibot/to-json-schema` 1.6 or later. You don't need it for the built-in ones: the schema package ships their JSON Schema. See [JSON Schema](/guide/json-schema).

## Next steps

Continue to [getting started](/guide/getting-started) to write your first definition and render it.
