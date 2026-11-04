import {
  toJsonSchema as convert,
  type ConversionConfig,
  type JsonSchema,
} from '@valibot/to-json-schema'
import { childField, itemField } from '../field-types/child-fields'
import type { FieldTypeDef, FieldTypeMeta } from '../field-types/field-type-def'
import type { FormRuleDef } from '../rules/form-rule-def'
import type { RuleDef } from '../rules/rule-def'
import { paramsFor } from '../rules/rule-params'
import type { AnyObjectSchema } from '../shared/valibot-types'
import type { ValueKind } from '../shared/value-kind'

/** The registries a JSON Schema is made from. A builder from `createSchemaBuilder()` has them. */
export interface JsonSchemaRegistries {
  readonly fieldTypes: Readonly<Record<string, FieldTypeDef>>
  readonly rules: Readonly<Record<string, RuleDef>>
  readonly formRules: Readonly<Record<string, FormRuleDef>>
}

/**
 * The JSON Schema of definitions for these registries, for editors and other tools.
 * It knows every type, rule and form rule by name, with their props and params. It can't know
 * what only `validate()` checks, such as duplicate names, defaults and form rule paths.
 */
export function toJsonSchema(registries: JsonSchemaRegistries): JsonSchema {
  const converter = createConverter()
  const rules = createRuleLists(registries.rules, converter)
  const types = Object.entries(registries.fieldTypes)
  const valueTypes = types.filter(([, type]) => type.kind !== 'none').map(([name]) => name)
  const typeSchemas = Object.fromEntries(
    types.map(([name, type]) => [
      `type.${name}`,
      fieldTypeSchema(name, type, rules.listFor(type), converter),
    ]),
  )

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Form definition',
    description:
      'A form for @whatsaaaa/form-builder-schema. Run validate() too: it also checks names, defaults and form rule paths.',
    type: 'object',
    properties: {
      $schema: { type: 'string' },
      version: { const: '1' },
      fields: { type: 'array', items: ref('field') },
      formRules: { type: 'array', items: ref('formRule') },
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
      ...rules.lists,
      ...rules.rules,
    },
  }
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

/** The title and description from a type's or rule's `meta`. */
function describe(meta: FieldTypeMeta | undefined): JsonSchema {
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
          ? { type: 'string', minLength: 1, pattern: '^[^.[\\]]*$' }
          : { type: 'string' },
        type: { const: name },
        label: { type: 'string' },
        description: { type: 'string' },
        placeholder: { type: 'string' },
        ...(!alwaysThere && { default: {} }),
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
        // A rule for the item kind but not for arrays runs on each item, as in validate().
        const kinds =
          kind === undefined
            ? def.kinds
            : def.kinds.includes(kind)
              ? [kind]
              : itemKind !== undefined && def.kinds.includes(itemKind)
                ? [itemKind]
                : []
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
}

const config: ConversionConfig = {
  target: 'draft-07',
  // A definition holds what the props and params schemas take, before any transformation.
  typeMode: 'input',
  errorMode: 'throw',
  // A child field is a reference to the schema of fields, or of list items.
  overrideSchema: ({ valibotSchema }) =>
    valibotSchema === childField ? ref('field') : valibotSchema === itemField ? ref('item') : null,
  // Checks like "every option has a different value" have no JSON Schema keyword. validate()
  // still runs them, so the schema without them is right, only less strict.
  overrideAction: ({ jsonSchema, errors }) => (errors ? jsonSchema : null),
}

/** Converts each schema once, so params shared by many rules warn only once. */
function createConverter(): Converter {
  const done = new Map<AnyObjectSchema, ObjectParts | undefined>()
  return {
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
