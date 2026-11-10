---
description: 'The API of the schema package: the builder, the registries, the rendering helpers and the types.'
---

# @whatsaaaa/form-builder-schema

The core package. It checks definitions, builds their Valibot schemas, and gives renderers in any framework what they need. See [getting started](/guide/getting-started).

## Builder

- [createSchemaBuilder](/api/schema/createSchemaBuilder)
- [SchemaBuilder](/api/schema/SchemaBuilder)

## Definition

- [getInitialInput](/api/schema/getInitialInput)
- [isRequired](/api/schema/isRequired)
- [walkFields](/api/schema/walkFields)

## Registries

- [defineFieldType](/api/schema/defineFieldType)
- [defineRule](/api/schema/defineRule)
- [defineFormRule](/api/schema/defineFormRule)
- [createBuildContext](/api/schema/createBuildContext)
- [defaultFieldTypes](/api/schema/defaultFieldTypes)
- [defaultKinds](/api/schema/defaultKinds)
- [defaultRules](/api/schema/defaultRules)
- [defaultFormRules](/api/schema/defaultFormRules)
- [Reserved keys](/api/schema/reserved-keys)

## Rendering

- [allFields](/api/schema/allFields)
- [checkComponents](/api/schema/checkComponents)
- [checkLayoutComponents](/api/schema/checkLayoutComponents)
- [coerceInput](/api/schema/coerceInput)
- [dotPathOf](/api/schema/dotPathOf)
- [fieldPathsOf](/api/schema/fieldPathsOf)
- [findField](/api/schema/findField)
- [issuesOfStep](/api/schema/issuesOfStep)
- [selectFields](/api/schema/selectFields)
- [shownNodes](/api/schema/shownNodes)
- [toFieldPath](/api/schema/toFieldPath)

## Errors

- [DefinitionError](/api/schema/DefinitionError)
- [formatPath](/api/schema/formatPath)

## JSON Schema

- [toJsonSchema](/api/schema/toJsonSchema)

## Types

- [DefinitionIssue](/api/schema/DefinitionIssue)
- [FieldNode](/api/schema/FieldNode)
- [FieldTypeDef](/api/schema/FieldTypeDef)
- [FormLayout](/api/schema/FormLayout)
- [FormRuleDef](/api/schema/FormRuleDef)
- [JsonField](/api/schema/JsonField)
- [JsonForm](/api/schema/JsonForm)
- [JsonFormRule](/api/schema/JsonFormRule)
- [JsonFormSchema](/api/schema/JsonFormSchema)
- [JsonLayout](/api/schema/JsonLayout)
- [JsonRule](/api/schema/JsonRule)
- [KindDef](/api/schema/KindDef)
- [MessageContext](/api/schema/MessageContext)
- [RuleDef](/api/schema/RuleDef)
- [SchemaBuilderOptions](/api/schema/SchemaBuilderOptions)
- [SchemaExtension](/api/schema/SchemaExtension)
- [TypedForm](/api/schema/TypedForm)
- [TypedJsonFormSchema](/api/schema/TypedJsonFormSchema)
- [ValueKind](/api/schema/ValueKind)
- [Visibility](/api/schema/Visibility)
- [WalkedField](/api/schema/WalkedField)

## Built-ins

- [Field types](/api/schema/field-types)
- [Rules](/api/schema/rules)
