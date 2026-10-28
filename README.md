# Form Builder

Build [Formisch](https://formisch.dev) forms from JSON.

## What is a Form Builder?

A form builder lets you describe a form as **data** instead of writing it by hand in code. You define the fields, their types, labels and validation rules in JSON document, and the builder turns definition into a working form.

This is useful when forms need to change without a redeploy, or when they come from somewhere other than your source code:

- a database (forms managed by admins or customers)
- a `.json` file in your project
- an API response or a visual form editor

## Status

Early work in progress. The initial JSON -> Formisch builder function is in place; the API and JSON format may change.

## Packages

| Package                                             | Description                                                      |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| [`@whatsaaaa/form-builder-schema`](packages/schema) | Build Formisch-ready Valibot schemas from JSON form definitions. |

## Development

This repository is a [pnpm workspace](https://pnpm.io/workspaces):

```
playground/        Vue app for trying out the packages locally (not published)
packages/schema/  @whatsaaaa/form-builder-schema
```

Lint, format and TypeScript tooling is shared at the workspace root. Dependency versions used by more than one package are kept in the `catalog` in `pnpm-workspace.yaml`.

Inside the workspace, packages are consumed straight from `src`, so changes show up in the playground without a build step. Publishing uses the built `dist` output (see `publishConfig` in each package).

```sh
pnpm install
pnpm dev          # start the playground
pnpm test         # run all package tests
pnpm type-check   # type-check every package
pnpm lint         # oxlint + eslint
pnpm format       # oxfmt
pnpm build        # build packages and the playground
```

## License

MIT
