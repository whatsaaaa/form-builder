---
description: 'An extension of the schema builder: the keys it adds and how it checks them.'
---

# SchemaExtension

A feature from another package that reads keys of its own on fields, and on the layout's steps and sections, like `affects()`.

## Definition

- `SchemaExtension`
  - `name` <code>string</code>: names it in messages
  - `fieldProps` <code>[AnyObjectSchema](/api/schema/FieldTypeDef#anyschema-anyaction-anyobjectschema)</code>: optional, the keys it adds to every field and every display element of the layout
  - `layoutProps` <code>[AnyObjectSchema](/api/schema/FieldTypeDef#anyschema-anyaction-anyobjectschema)</code>: optional, the keys it adds to steps and sections
  - `definitions` <code>Readonly&lt;Record&lt;string, [AnySchema](/api/schema/FieldTypeDef#anyschema-anyaction-anyobjectschema)&gt;&gt;</code>: optional, named schemas its props refer to, for `toJsonSchema()`
  - `check` <code>(ctx: [ExtensionContext](/api/schema/SchemaExtension#extensioncontext)) =&gt; ReadonlyMap&lt;[ExtensionTarget](/api/schema/SchemaExtension#extensiontarget), [TargetConditions](/api/schema/SchemaExtension#targetconditions)&gt;</code>: checks its keys and gives the conditions of each target

### Explanation

See [extensions](/guide/extensions).

## ExtensionContext

- `ExtensionContext`
  - `targets` `readonly ExtensionTarget[]`: every field, and every step, section and display element of the layout, in document order
  - `resolve` `(dotPath: string, from: ExtensionTarget) => ResolvedField | string | null`: the field a path names, a message when there is none, or `null` when it has issues of its own
  - `issue` `(code: DefinitionIssueCode, path: DefinitionPath, message: string) => void`: adds an issue

## ExtensionTarget

```ts
type ExtensionTarget = FieldTarget | LayoutTarget
```

- `FieldTarget`
  - `kind` `'field'`
  - `field` [`WalkedField`](/api/schema/WalkedField)
  - `json` `Readonly<Record<string, unknown>>`: the field as written
  - `definitionPath` `DefinitionPath`
- `LayoutTarget`
  - `kind` `'step' | 'section' | 'display'`
  - `json` `Readonly<Record<string, unknown>>`: the node as written
  - `definitionPath` `DefinitionPath`
  - `dataPath` `readonly (string | number)[]`: where the values of the fields around it are

## ResolvedField

- `ResolvedField`
  - `field` [`WalkedField`](/api/schema/WalkedField)
  - `kind` `ValueKind`, and `kindDef` [`KindDef`](/api/schema/KindDef)
  - `schema` `AnySchema`: the values it accepts, without any condition
  - `item` `{ kind: ValueKind; schema: AnySchema } | undefined`: for a list whose items have a value

## TargetConditions

- `TargetConditions`
  - `reads` `readonly { field: ResolvedField; at: DefinitionPath }[]`: the fields they read, and where
  - `evaluate` `(read: (i: number) => unknown) => { hidden: boolean; clear: boolean }`: whether they hide and clear the target, where `read(i)` is the input of `reads[i]`

## Example

<<< @/snippets/schema/extensions.ts#extension

## Related

### Packages

- [affects](/api/affects/affects)
