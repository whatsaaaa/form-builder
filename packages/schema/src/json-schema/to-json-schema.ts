import {
  toJsonSchema as convert,
  type ConversionConfig,
  type JsonSchema,
} from '@valibot/to-json-schema'
import type * as v from 'valibot'
import { LAYOUT_TYPES, ROW_COLUMNS } from '../definition/json-layout'
import type { SchemaExtension } from '../extensions/schema-extension'
import { childField, itemField } from '../field-types/child-fields'
import type { FieldTypeDef, FieldTypeMeta } from '../field-types/field-type-def'
import type { FormRuleDef } from '../rules/form-rule-def'
import type { RuleDef, RuleMeta } from '../rules/rule-def'
import { paramsFor } from '../rules/rule-params'
import { RESERVED_NAMES } from '../shared/reserved-keys'
import type { AnyObjectSchema, AnySchema } from '../shared/valibot-types'
import type { ValueKind } from '../shared/value-kind'

/** The registries a JSON Schema is made from. A builder from `createSchemaBuilder()` has them. */
export interface JsonSchemaRegistries {
  readonly fieldTypes: Readonly<Record<string, FieldTypeDef>>
  readonly rules: Readonly<Record<string, RuleDef>>
  readonly formRules: Readonly<Record<string, FormRuleDef>>
  /** The builder's extensions: the keys they add, on every field and on steps and sections. */
  readonly extensions?: readonly SchemaExtension[]
}

/**
 * The JSON Schema of definitions for these registries, for editors and other tools.
 * It knows every type, rule and form rule by name, with their props and params, the layout's
 * nodes, and the keys of the extensions. It can't know what only `validate()` checks, such as
 * duplicate names, defaults, form rule paths and layout references, or the paths conditions read.
 */
export function toJsonSchema(registries: JsonSchemaRegistries): JsonSchema {
  const extensions = registries.extensions ?? []
  // Each definition of an extension is named after the extension: `affects.condition`.
  const named = new Map(
    extensions.flatMap((extension) =>
      Object.entries(extension.definitions ?? {}).map(([name, schema]): [AnySchema, string] => [
        schema,
        `${extension.name}.${name}`,
      ]),
    ),
  )
  const converter = createConverter(named)
  const rules = createRuleLists(registries.rules, converter)
  const types = Object.entries(registries.fieldTypes)
  const valueTypes = types.filter(([, type]) => type.kind !== 'none').map(([name]) => name)
  const fieldProps = extensionProps(extensions, 'fieldProps', converter)
  const layoutProps = extensionProps(extensions, 'layoutProps', converter)
  const typeSchemas = Object.fromEntries(
    types.map(([name, type]) => [
      `type.${name}`,
      fieldTypeSchema(name, type, rules.listFor(type), converter, fieldProps),
    ]),
  )

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Form definition',
    description:
      'A form for @whatsaaaa/form-builder-schema. Run validate() too: it also checks names, defaults, form rule paths and layout references.',
    type: 'object',
    properties: {
      $schema: { type: 'string' },
      version: { const: '1' },
      fields: { type: 'array', items: ref('field') },
      formRules: { type: 'array', items: ref('formRule') },
      layout: ref('layout'),
    },
    required: ['version', 'fields'],
    additionalProperties: false,
    definitions: {
      // A field in a list of fields needs a name, unless its type has no value.
      field: byName(
        'type',
        types.map(([name]) => {
          const schema = ref(`type.${name}`)
          return [
            name,
            valueTypes.includes(name) ? { allOf: [schema], required: ['name'] } : schema,
          ]
        }),
        'No field type is registered',
      ),
      // The field of a list's items needs no name, but it must have a value.
      item: byName(
        'type',
        valueTypes.map((name) => [name, ref(`type.${name}`)]),
        'No field type with a value is registered',
      ),
      formRule: byName(
        'rule',
        Object.entries(registries.formRules).map(([name, def]) => [
          name,
          formRuleSchema(name, def, converter),
        ]),
        'No form rule is registered',
      ),
      ...typeSchemas,
      ...layoutSchemas(
        types.filter(([, type]) => type.kind === 'none').map(([name]) => name),
        typeSchemas,
        layoutProps,
      ),
      ...rules.lists,
      ...rules.rules,
      ...Object.fromEntries(
        [...named].map(([schema, name]) => [name, converter.schema(schema, `"${name}"`)]),
      ),
    },
  }
}

/** The keys every extension adds with `fieldProps` or `layoutProps`. */
function extensionProps(
  extensions: readonly SchemaExtension[],
  key: 'fieldProps' | 'layoutProps',
  converter: Converter,
): NonNullable<JsonSchema['properties']> {
  return Object.assign(
    {},
    ...extensions.map(
      (extension) =>
        converter.object(extension[key], `the ${key} of extension "${extension.name}"`)
          ?.properties ?? {},
    ),
  )
}

/** A reference to one of the definitions, as a JSON Pointer. */
const ref = (name: string): JsonSchema => ({
  $ref: `#/definitions/${name.replaceAll('~', '~0').replaceAll('/', '~1')}`,
})

/**
 * An object picked by one key, like a field by its `type`. The key must be one of the names, and
 * the object must match the schema for that name, so editors suggest the names first and then the
 * keys of the one picked. With no names, nothing fits, and `none` says why.
 */
function byName(
  key: string,
  schemas: readonly [name: string, schema: JsonSchema][],
  none: string,
): JsonSchema {
  if (!schemas.length) return { description: none, not: {} }
  return {
    type: 'object',
    properties: { [key]: { enum: schemas.map(([name]) => name) } },
    required: [key],
    allOf: schemas.map(([name, schema]) => ({
      if: { properties: { [key]: { const: name } }, required: [key] },
      // oxlint-disable-next-line unicorn/no-thenable -- JSON Schema conditional keyword
      then: schema,
    })),
  }
}

/**
 * The layout and its nodes. Each node is there twice: as an item, and as an item of a row, which
 * takes `span`, so an editor flags `span` outside a row. A display element is its type's field
 * without `name`, with `id`.
 */
function layoutSchemas(
  displayTypes: readonly string[],
  typeSchemas: Readonly<Record<string, JsonSchema>>,
  extensionProps: NonNullable<JsonSchema['properties']>,
): Record<string, JsonSchema> {
  const id: JsonSchema = { type: 'string', minLength: 1 }
  const ui: JsonSchema = { type: 'object' }
  const span: JsonSchema = { type: 'integer', minimum: 1, maximum: ROW_COLUMNS }
  const list = (item: string): JsonSchema => ({ type: 'array', minItems: 1, items: ref(item) })

  const nodes = (item: string, cell: boolean): Record<string, JsonSchema> => {
    const node = (name: string, properties: NonNullable<JsonSchema['properties']>) => ({
      [`${item}.${name}`]: {
        type: 'object',
        properties: cell ? { ...properties, span } : properties,
        required:
          name === 'field' ? ['field'] : name === 'slot' ? ['type', 'name'] : ['type', 'items'],
        additionalProperties: false,
      } satisfies JsonSchema,
    })
    const displays = displayTypes.map((name): [string, JsonSchema] => {
      const schema = typeSchemas[`type.${name}`] as Exclude<JsonSchema, boolean>
      // A type whose props have no JSON Schema form takes any keys here too.
      if (!schema.properties) return [name, schema]
      const properties = Object.fromEntries(
        Object.entries(schema.properties).filter(([key]) => key !== 'name'),
      )
      return [name, { ...schema, properties: { ...properties, id, ...(cell && { span }) } }]
    })
    // The cells of a row are fixed, so "*" is no item of a row.
    const path: JsonSchema = cell
      ? { type: 'string', minLength: 1, not: { const: '*' } }
      : { type: 'string', minLength: 1 }
    return {
      [item]: {
        anyOf: [
          path,
          ref(`${item}.field`),
          byName(
            'type',
            [
              ...LAYOUT_TYPES.map((type): [string, JsonSchema] => [type, ref(`${item}.${type}`)]),
              ...displays,
            ],
            'No layout type is registered',
          ),
        ],
      },
      ...node('field', { field: { type: 'string', minLength: 1 }, items: ref('layoutItems') }),
      ...node('section', {
        type: { const: 'section' },
        id,
        label: { type: 'string' },
        description: { type: 'string' },
        items: ref('layoutItems'),
        ui,
        ...extensionProps,
      }),
      ...node('row', { type: { const: 'row' }, id, items: ref('rowItems'), ui }),
      ...node('slot', { type: { const: 'slot' }, name: { type: 'string', minLength: 1 } }),
    }
  }

  return {
    layout: {
      title: 'Layout',
      description: 'Where the fields go: "items" for one page, or "steps" for several.',
      type: 'object',
      properties: { items: ref('layoutItems'), steps: { ...list('layoutStep') }, ui },
      oneOf: [{ required: ['items'] }, { required: ['steps'] }],
      additionalProperties: false,
    },
    layoutStep: {
      type: 'object',
      properties: {
        id,
        label: { type: 'string' },
        description: { type: 'string' },
        items: ref('layoutItems'),
        ui,
        ...extensionProps,
      },
      required: ['items'],
      additionalProperties: false,
    },
    layoutItems: list('layoutItem'),
    rowItems: list('rowItem'),
    ...nodes('layoutItem', false),
    ...nodes('rowItem', true),
  }
}

/** The title and description from a type's, rule's or form rule's `meta`. */
function describe(meta: FieldTypeMeta | RuleMeta | undefined): JsonSchema {
  return {
    ...(meta && { title: meta.label }),
    ...(meta?.description && { description: meta.description }),
  }
}

function fieldTypeSchema(
  name: string,
  type: FieldTypeDef,
  rules: string | undefined,
  converter: Converter,
  extensionProps: NonNullable<JsonSchema['properties']>,
): JsonSchema {
  const props = converter.object(type.props, `the props of field type "${name}"`)
  if (!props) return { type: 'object', ...describe(type.meta) }

  const hasValue = type.kind !== 'none'
  // A group is always there, so it can't be required or have a default.
  const alwaysThere = type.container === true && type.kind === 'object'

  return object(
    {
      ...describe(type.meta),
      properties: {
        // A name is one key of the value, so it can't hold the separators of paths.
        name: hasValue
          ? {
              type: 'string',
              minLength: 1,
              pattern: '^[^.[\\]]*$',
              not: { enum: [...RESERVED_NAMES] },
            }
          : { type: 'string' },
        type: { const: name },
        label: { type: 'string' },
        description: { type: 'string' },
        placeholder: { type: 'string' },
        ...(hasValue && !alwaysThere && { default: {} }),
        ...(hasValue &&
          !alwaysThere && {
            required: {
              anyOf: [
                { type: 'boolean' },
                {
                  type: 'object',
                  properties: { message: { type: 'string' } },
                  additionalProperties: false,
                },
              ],
            },
          }),
        ...(rules && { rules: { type: 'array', items: ref(rules) } }),
        ui: { type: 'object' },
        ...extensionProps,
      },
    },
    props,
  )
}

interface RuleLists {
  /** The definition with the rules a type's fields can have, or undefined without a value. */
  listFor(type: FieldTypeDef): string | undefined
  /** The lists of rules, one per kind the types have. */
  readonly lists: Record<string, JsonSchema>
  /** Each rule once, or once per kind when its params depend on the kind. */
  readonly rules: Record<string, JsonSchema>
}

function createRuleLists(
  registry: Readonly<Record<string, RuleDef>>,
  converter: Converter,
): RuleLists {
  const lists: Record<string, JsonSchema> = {}
  const rules: Record<string, JsonSchema> = {}

  function ruleFor(name: string, def: RuleDef, kind: ValueKind): string {
    const key = typeof def.params === 'function' ? `rule.${name}.${kind}` : `rule.${name}`
    rules[key] ??= ruleSchema(name, def, kind, converter)
    return key
  }

  function list(key: string, kind?: ValueKind, itemKind?: ValueKind): string {
    lists[key] ??= byName(
      'rule',
      Object.entries(registry).flatMap(([name, def]): [string, JsonSchema][] => {
        const kinds = kind === undefined ? def.kinds : kindsOn(def, kind, itemKind)
        const refs = [...new Set(kinds.map((each) => ruleFor(name, def, each)))].map(ref)
        const [first, ...more] = refs
        if (!first) return []
        return [[name, more.length ? { anyOf: refs } : first]]
      }),
      'No registered rule fits fields of this type',
    )
    return key
  }

  return {
    listFor(type) {
      if (type.kind === 'none') return undefined
      // A kind that depends on the props, like a select's, can be any kind, so every rule fits.
      if (typeof type.kind === 'function') return list('rules')
      if (type.kind !== 'array' || type.itemKind === undefined) {
        return list(`rules.${type.kind}`, type.kind)
      }
      if (typeof type.itemKind === 'function') return list('rules')
      return list(`rules.array.${type.itemKind}`, 'array', type.itemKind)
    },
    lists,
    rules,
  }
}

/**
 * The kind whose params a rule takes on a field of `kind`: that kind, or the item kind for a rule
 * that runs on each item, as in validate(). None when the rule doesn't fit the field.
 */
function kindsOn(def: RuleDef, kind: ValueKind, itemKind: ValueKind | undefined): ValueKind[] {
  if (def.kinds.includes(kind)) return [kind]
  if (itemKind !== undefined && def.kinds.includes(itemKind)) return [itemKind]
  return []
}

function ruleSchema(name: string, def: RuleDef, kind: ValueKind, converter: Converter): JsonSchema {
  const params = converter.object(paramsFor(def, kind), `the params of rule "${name}"`)
  if (!params) return { type: 'object', ...describe(def.meta) }
  return object(
    {
      ...describe(def.meta),
      properties: { rule: { const: name }, message: { type: 'string' } },
      required: ['rule'],
    },
    params,
  )
}

function formRuleSchema(name: string, def: FormRuleDef, converter: Converter): JsonSchema {
  const params = converter.object(def.params, `the params of form rule "${name}"`)
  if (!params) return { type: 'object', ...describe(def.meta) }
  return object(
    {
      ...describe(def.meta),
      properties: {
        rule: { const: name },
        field: { type: 'string', minLength: 1 },
        message: { type: 'string' },
      },
      required: ['rule', 'field', 'message'],
    },
    params,
  )
}

/** The keys of an object schema, ready to merge with the keys this package owns. */
interface ObjectParts {
  properties: NonNullable<JsonSchema['properties']>
  required: string[]
}

/** An object with exactly the given keys, those of `own` first. */
function object(own: JsonSchema, parts: ObjectParts): JsonSchema {
  const required = [...(own.required ?? []), ...parts.required]
  return {
    ...own,
    type: 'object',
    properties: { ...own.properties, ...parts.properties },
    ...(required.length > 0 && { required }),
    additionalProperties: false,
  }
}

interface Converter {
  /**
   * The keys of a props or params schema, or undefined when it can't be converted. Then there is
   * a console warning, and the type or rule takes any keys.
   */
  object(schema: AnyObjectSchema | undefined, what: string): ObjectParts | undefined
  /** A whole schema, or any value with a console warning when it can't be converted. */
  schema(schema: AnySchema, what: string): JsonSchema
}

/**
 * The config to convert with. A child field is a reference to the schema of fields, or of list
 * items, and a `v.lazy()` that returns one of `named` a reference to it.
 */
function configWith(named: ReadonlyMap<AnySchema, string>): ConversionConfig {
  return {
    target: 'draft-07',
    // A definition holds what the props and params schemas take, before any transformation.
    typeMode: 'input',
    errorMode: 'throw',
    overrideSchema: ({ valibotSchema }) => {
      if (valibotSchema === childField) return ref('field')
      if (valibotSchema === itemField) return ref('item')
      if (valibotSchema.type !== 'lazy') return null
      const name = named.get((valibotSchema as v.LazySchema<AnySchema>).getter(undefined))
      return name === undefined ? null : ref(name)
    },
    // Checks like "every option has a different value" have no JSON Schema keyword. validate()
    // still runs them, so the schema without them is right, only less strict.
    overrideAction: ({ jsonSchema, errors }) => (errors ? jsonSchema : null),
  }
}

/** Converts each schema once, so params shared by many rules warn only once. */
function createConverter(named: ReadonlyMap<AnySchema, string>): Converter {
  const config = configWith(named)
  const done = new Map<AnyObjectSchema, ObjectParts | undefined>()
  return {
    schema(schema, what) {
      try {
        // Only the schema itself: the definitions it refers to are written once, on their own.
        const { $schema: _, $defs: __, ...json } = convert(schema, config)
        return json
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        warn(`toJsonSchema(): ${what} can't be converted, so any value is allowed. ${reason}`)
        return {}
      }
    },
    object(schema, what) {
      if (!schema) return { properties: {}, required: [] }
      if (done.has(schema)) return done.get(schema)

      let parts: ObjectParts | undefined
      try {
        const json = convert(schema, config)
        parts = { properties: json.properties ?? {}, required: json.required ?? [] }
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        warn(`toJsonSchema(): ${what} can't be converted, so any keys are allowed. ${reason}`)
      }
      done.set(schema, parts)
      return parts
    },
  }
}

/** `console.warn`. This package's tsconfig has no DOM or Node types, so it is typed here. */
const warn = (message: string) =>
  (globalThis as { console?: { warn(message: string): void } }).console?.warn(message)
