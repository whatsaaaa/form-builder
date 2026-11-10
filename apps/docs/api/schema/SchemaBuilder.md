---
description: 'The object createSchemaBuilder returns: its methods and registries.'
---

# SchemaBuilder

What [`createSchemaBuilder`](/api/schema/createSchemaBuilder) returns. Its methods are plain functions, so they can be destructured: `const { build, validate } = createSchemaBuilder()`.

## Generics

- `TFieldTypes` <code>extends Record&lt;string, [FieldTypeDef](/api/schema/FieldTypeDef)&gt;</code>
- `TRules` <code>extends Record&lt;string, [RuleDef](/api/schema/RuleDef)&gt;</code>
- `TFormRules` <code>extends Record&lt;string, [FormRuleDef](/api/schema/FormRuleDef)&gt;</code>
- `TExtensionProps` <code>extends [ExtensionProps](/api/schema/TypedForm)</code>

## Definition

- `SchemaBuilder`
  - `build` <code>(json: [JsonForm](/api/schema/JsonForm)) =&gt; [JsonFormSchema](/api/schema/JsonFormSchema)</code>
  - `validate` <code>(json: unknown) =&gt; [ValidateResult](/api/schema/DefinitionIssue#validateresult)</code>
  - `defineForm` <code>(definition: [TypedForm](/api/schema/TypedForm)) =&gt; [TypedForm](/api/schema/TypedForm)</code>
  - `getInitialInput` <code>(json: [JsonForm](/api/schema/JsonForm)) =&gt; Record&lt;string, unknown&gt;</code>
  - `getItemInput` <code>(field: [JsonField](/api/schema/JsonField)) =&gt; unknown</code>
  - `getFieldTree` <code>(json: [JsonForm](/api/schema/JsonForm)) =&gt; [FieldNode](/api/schema/FieldNode)[]</code>
  - `getLayout` <code>(json: [JsonForm](/api/schema/JsonForm)) =&gt; [FormLayout](/api/schema/FormLayout)</code>
  - `getVisibility` <code>(json: [JsonForm](/api/schema/JsonForm)) =&gt; [Visibility](/api/schema/Visibility)</code>
  - `walkFields` <code>(json: [JsonForm](/api/schema/JsonForm)) =&gt; Generator&lt;[WalkedField](/api/schema/WalkedField)&gt;</code>
  - `rulesForKind` <code>(kind: [ValueKind](/api/schema/ValueKind)) =&gt; [name: string, def: [RuleDef](/api/schema/RuleDef)][]</code>
  - `kinds` <code>Readonly&lt;Record&lt;string, [KindDef](/api/schema/KindDef)&gt;&gt;</code>
  - `fieldTypes` <code>Readonly&lt;TFieldTypes&gt;</code>
  - `rules` <code>Readonly&lt;TRules&gt;</code>
  - `formRules` <code>Readonly&lt;TFormRules&gt;</code>
  - `extensions` <code>readonly [SchemaExtension](/api/schema/SchemaExtension)[]</code>

## Methods

### build

```ts
const schema = builder.build(json)
const schema = builder.build<TInput, TOutput>(json)
```

Checks the definition and builds the Valibot schema of the whole form: an object schema with a key for each field, in a `v.pipe()` with a check for each form rule when it has any. Throws one [`DefinitionError`](/api/schema/DefinitionError) with every issue. With your input type, and your output type when it differs, the schema is typed as a [`TypedJsonFormSchema`](/api/schema/TypedJsonFormSchema). See [TypeScript](/guide/typescript#typing-the-form).

### validate

```ts
const result = builder.validate(json)
```

Every issue in a definition, in document order, as a [`ValidateResult`](/api/schema/DefinitionIssue#validateresult). It never throws, whatever `json` is. See [checking definitions](/guide/checking-definitions).

### defineForm

```ts
const definition = builder.defineForm(definition)
```

Types a definition written in TypeScript against the builder's registries and extensions, and returns it unchanged. See [TypeScript](/guide/typescript#writing-definitions-in-code) and [`TypedForm`](/api/schema/TypedForm).

### getInitialInput

```ts
const input = builder.getInitialInput(json)
```

Formisch's `initialInput`: each field's `default`, nested the way the value is. Like the [`getInitialInput`](/api/schema/getInitialInput) function, but it reads the builder's own container types too. It never throws, and leaves out a field with issues. A field that conditions clear when the form starts starts blank.

### getItemInput

```ts
const input = builder.getItemInput(field)
```

The input of a new item of a list, for Formisch's `insert()`: an object of the defaults of its `fields`, or the default of its `of` field. Undefined for a field that isn't a container of kind `array`. It never throws.

### getFieldTree

```ts
const fields = builder.getFieldTree(json)
```

The definition's fields as a tree of [`FieldNode`](/api/schema/FieldNode)s, each with its role, for a renderer. Throws a `DefinitionError` like `build()`.

### getLayout

```ts
const layout = builder.getLayout(json)
```

The definition's layout as a [`FormLayout`](/api/schema/FormLayout), with every reference resolved: its steps, each a tree of sections, rows, slots and fields. Without a `layout`, one step with every field in order. Throws a `DefinitionError` like `build()`.

### getVisibility

```ts
const visibility = builder.getVisibility(json)
```

What the conditions of the builder's extensions hide, for any input, as a [`Visibility`](/api/schema/Visibility). Without extensions or conditions, nothing is hidden. Throws a `DefinitionError` like `build()`. See [conditions](/guide/conditions#rendering).

### walkFields

```ts
for (const field of builder.walkFields(json)) {
  // ...
}
```

Every field of the definition, at every depth, in document order, as [`WalkedField`](/api/schema/WalkedField)s with their kinds. Like the [`walkFields`](/api/schema/walkFields) function, but it reads the builder's own container types too. It never throws, and a container with issues isn't walked into.

### rulesForKind

```ts
const rules = builder.rulesForKind(kind)
```

The registered rules that fit a field of `kind`, as `[name, def]` pairs, like for a rule picker. See [listing rules](/guide/rules#listing-rules).

### Registries

`kinds`, `fieldTypes`, `rules`, `formRules` and `extensions` are the builder's registries: the built-in entries merged with yours.

## Related

### Functions

- [createSchemaBuilder](/api/schema/createSchemaBuilder)
