---
description: 'One problem in a definition: its code, its path and a message.'
---

# DefinitionIssue

One problem in a definition, as `validate()` and `DefinitionError` give it.

## Definition

- `DefinitionIssue`
  - `code` <code>[DefinitionIssueCode](/api/schema/DefinitionIssue#definitionissuecode)</code>
  - `path` <code>[DefinitionPath](/api/schema/DefinitionIssue#definitionpath)</code>: where it is in the definition, like `['fields', 0, 'rules', 1]`
  - `message` <code>string</code>

## DefinitionIssueCode

```ts
type DefinitionIssueCode =
  | 'invalid_shape'
  | 'unsupported_version'
  | 'unknown_key'
  | 'unknown_type'
  | 'missing_name'
  | 'invalid_name'
  | 'duplicate_name'
  | 'invalid_props'
  | 'invalid_default'
  | 'unknown_rule'
  | 'unknown_param'
  | 'invalid_params'
  | 'kind_mismatch'
  | 'unknown_field'
  | 'duplicate_placement'
  | 'unplaced_field'
  | 'duplicate_id'
  | 'invalid_span'
  | 'invalid_value'
  | 'cycle'
```

[Checking definitions](/guide/checking-definitions#issue-codes) explains each one. Codes and paths are API, messages are not, and a minor version can add a code: handle codes you don't know. See [codes are API](/guide/checking-definitions#codes-are-api-messages-are-not).

## DefinitionPath

```ts
type DefinitionPath = readonly (string | number)[]
```

## ValidateResult

```ts
type ValidateResult =
  | { success: true; issues: [] }
  | { success: false; issues: DefinitionIssue[] }
```

## Related

### Functions

- [formatPath](/api/schema/formatPath)

### Classes

- [DefinitionError](/api/schema/DefinitionError)
