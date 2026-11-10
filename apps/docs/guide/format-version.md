---
description: How the version of the JSON format relates to the versions of the packages, and what a new release can add to the format.
---

# Format version

Every definition has `"version": "1"`. It is the version of the JSON format, not of the packages, so a definition you store today keeps working as the packages move on. Below you will learn what the version promises, and how to tell which package version a feature needs.

## What `"1"` promises

`version` stays `"1"` for every 1.x release of the schema package:

- **A definition that works today keeps working**, with the same meaning, in every later 1.x release.
- **A minor release can add to the format**, like a new field type, rule, key or layout node, and keeps `version: "1"`. Adding never bumps the version.
- **`"2"` only comes with a change that breaks definitions**, in a major release of the package. Any other `version` is `unsupported_version`.

The names a minor release can give a meaning are [reserved](/api/schema/reserved-keys) now, so an addition never takes a name that your own field types, props or display elements already use. Any other new reserved name only comes in a major release.

## Which version a feature needs

A definition that uses something new needs a package version that has it. An older one rejects it: `validate()` reports it, for example as `unknown_type` or `unknown_key`, and `build()` throws. So the docs and the changelog name the version that added each feature:

- Everything on this site as of 1.0 works with `1.0.0` and later.
- A feature added later shows the version that added it next to its heading, like <Badge type="info" text="1.1+" />, and the changelog of the schema package names it too.

When the definitions you store are read by more than one app, update the packages in every app before you use a new feature, or check each definition with `validate()` in the app with the oldest package.

## The JSON Schema

The [JSON Schema](/guide/json-schema) of the format is hosted at a URL with the format version in it, which is also its `$id`:

```txt
https://whatsaaaa.github.io/form-builder/schema/v1/definition.schema.json
```

It stays the same URL for every 1.x release, and always has the latest additions. To pin it to the package version you installed, point `$schema` at the copy in `node_modules` instead.

## Extensions

The keys of an [extension](/guide/extensions), like `affects`, are versioned by the extension's own package, not by `version`. The affects package is before 1.0, so a 0.x minor of it can still change what `affects` takes. See [stability](/guide/stability#packages).
