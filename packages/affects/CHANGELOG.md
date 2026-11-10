# @whatsaaaa/form-builder-affects

## 0.2.1

### Patch Changes

- [#53](https://github.com/whatsaaaa/form-builder/pull/53) [`ee418eb`](https://github.com/whatsaaaa/form-builder/commit/ee418eb20f12aab4c1956166f67e90d691f5f473) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - The `homepage` of each package points at its page on the docs site, https://whatsaaaa.github.io/form-builder/, instead of the repository.
- Updated dependencies [[`ee418eb`](https://github.com/whatsaaaa/form-builder/commit/ee418eb20f12aab4c1956166f67e90d691f5f473)]:
  - @whatsaaaa/form-builder-schema@0.17.1

## 0.2.0

### Minor Changes

- [#49](https://github.com/whatsaaaa/form-builder/pull/49) [`b096dbd`](https://github.com/whatsaaaa/form-builder/commit/b096dbdec3bd9e3033a72d4b14e01cd36255971f) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - `AffectsPropsSchema`, the type of the schema of the `affects` key that `AffectsExtension` has, is exported. `definition.schema.json` has an `$id`, and the docs site hosts it there, at https://whatsaaaa.github.io/form-builder/schema/v1/affects/definition.schema.json.

### Patch Changes

- Updated dependencies [[`b096dbd`](https://github.com/whatsaaaa/form-builder/commit/b096dbdec3bd9e3033a72d4b14e01cd36255971f)]:
  - @whatsaaaa/form-builder-schema@0.17.0

## 0.1.3

### Patch Changes

- Updated dependencies [[`4dcacd6`](https://github.com/whatsaaaa/form-builder/commit/4dcacd68d32e614236581125bed3f158685feaa5)]:
  - @whatsaaaa/form-builder-schema@0.16.0

## 0.1.2

### Patch Changes

- [#45](https://github.com/whatsaaaa/form-builder/pull/45) [`43d34b5`](https://github.com/whatsaaaa/form-builder/commit/43d34b5fae8e8fc10993bf871708e7bc1e2fdbda) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - The README links to the guide and the API reference on the docs site, https://whatsaaaa.github.io/form-builder/, which replaces the guides in `docs/` in the repository.
- Updated dependencies [[`43d34b5`](https://github.com/whatsaaaa/form-builder/commit/43d34b5fae8e8fc10993bf871708e7bc1e2fdbda)]:
  - @whatsaaaa/form-builder-schema@0.15.2

## 0.1.1

### Patch Changes

- [#41](https://github.com/whatsaaaa/form-builder/pull/41) [`e4a21b4`](https://github.com/whatsaaaa/form-builder/commit/e4a21b42ba6a12e8c5263b23b19cfcc91dac7ae5) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - A shorter README, with badges for the version, downloads, CI and coverage. The full guide moved to `docs/guide.md` in the repository, linked from the README.
- Updated dependencies [[`e4a21b4`](https://github.com/whatsaaaa/form-builder/commit/e4a21b42ba6a12e8c5263b23b19cfcc91dac7ae5)]:
  - @whatsaaaa/form-builder-schema@0.15.1

## 0.1.0

### Minor Changes

- [#38](https://github.com/whatsaaaa/form-builder/pull/38) [`76eba28`](https://github.com/whatsaaaa/form-builder/commit/76eba28572eb58ea2d1b6eacef2a960f0771a355) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - First release: conditions for JSON form definitions. `affects` on a field, a step, a section or a display element is a list of effects, `show`, `hide` and `hideAndClear`, each with a condition: a test of one field by its dot path (`equals`, `notEquals`, `in`, `includes`, `empty`, `notEmpty`), or `all` and `any` of conditions. Fields of a list's items read the same item with `lines.*.kind`.

  ```ts
  import { affects } from '@whatsaaaa/form-builder-affects'

  const builder = createSchemaBuilder({ extensions: [affects()] })
  ```

  Hide always wins. A hidden field isn't validated, and counts as empty in other conditions. `hideAndClear` submits it blank, and the adapters set it blank in the form; a field hidden otherwise submits its output when it is valid. Groups, lists, sections and steps hide what is in them, and a group, section, row or step whose fields are all hidden hides too. `validate()` checks the shape, the paths, the operators by kind, the values by the fields' schemas, and loops. The package ships its own `definition.schema.json`.

### Patch Changes

- Updated dependencies [[`76eba28`](https://github.com/whatsaaaa/form-builder/commit/76eba28572eb58ea2d1b6eacef2a960f0771a355)]:
  - @whatsaaaa/form-builder-schema@0.15.0
