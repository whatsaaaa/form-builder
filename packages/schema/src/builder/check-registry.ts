import type { FieldTypeDef } from '../field-types/field-type-def'
import { paramsFor } from '../rules/rule-params'
import {
  isReservedFieldKey,
  isReservedFormRuleKey,
  isReservedRuleKey,
} from '../shared/reserved-keys'
import type { AnyObjectSchema } from '../shared/valibot-types'
import { runtimeOf } from './extension-runtime'
import { lookup, type Registry } from './registry'
import { checkDefaultRules } from './validate-definition'

/**
 * Throws a `TypeError` for the first mistake in the registries, such as params with a reserved
 * key or a field type of a kind that isn't registered. These are mistakes in the code, not in a
 * definition, so they surface when the builder is created.
 */
export function checkRegistry(registry: Registry): void {
  for (const [name, rule] of Object.entries(registry.rules)) {
    // Params can depend on the kind, so check them for every kind the rule supports.
    for (const kind of rule.kinds) {
      rejectReservedKeys(paramsFor(rule, kind), isReservedRuleKey, `Rule "${name}": params`)
    }
  }

  for (const [name, rule] of Object.entries(registry.formRules)) {
    rejectReservedKeys(rule.params, isReservedFormRuleKey, `Form rule "${name}": params`)
  }

  for (const [name, type] of Object.entries(registry.fieldTypes)) {
    checkFieldType(name, type, registry)
  }

  checkExtensions(registry)
}

/** The keys of a layout's steps and sections, which an extension's layout props can't use. */
const LAYOUT_KEYS = ['type', 'id', 'label', 'description', 'items', 'ui', 'span', 'field', 'name']

/**
 * An extension's keys can't be reserved, a field type's props, or another extension's, so every
 * key of a field has one owner.
 */
function checkExtensions(registry: Registry): void {
  const owners = new Map<string, string>()
  const [first] = registry.extensions
  for (const extension of registry.extensions) {
    const at = `Extension "${extension.name}"`
    const runtime = runtimeOf(extension)
    if (!runtime) throw new TypeError(`${at}: make it with defineExtension()`)
    if (runtime !== runtimeOf(first)) {
      const other = (first as { name: string }).name
      throw new TypeError(
        `${at} and extension "${other}" were made with two copies of @whatsaaaa/form-builder-schema. Install one`,
      )
    }
    for (const key of Object.keys(extension.fieldProps?.entries ?? {})) {
      if (isReservedFieldKey(key)) {
        throw new TypeError(`${at}: fieldProps can't use the reserved key "${key}"`)
      }
      for (const [name, type] of Object.entries(registry.fieldTypes)) {
        if (Object.hasOwn(type.props?.entries ?? {}, key)) {
          throw new TypeError(
            `${at}: fieldProps can't use "${key}", a prop of field type "${name}"`,
          )
        }
      }
      claim(owners, `fields:${key}`, extension.name, `${at}: fieldProps`, key)
    }
    for (const key of Object.keys(extension.layoutProps?.entries ?? {})) {
      if (LAYOUT_KEYS.includes(key)) {
        throw new TypeError(`${at}: layoutProps can't use the layout's key "${key}"`)
      }
      claim(owners, `layout:${key}`, extension.name, `${at}: layoutProps`, key)
    }
  }
}

/** Gives `slot` to the extension `name`, unless another one has it. */
function claim(
  owners: Map<string, string>,
  slot: string,
  name: string,
  at: string,
  key: string,
): void {
  const owner = owners.get(slot)
  if (owner) throw new TypeError(`${at} can't use "${key}", which extension "${owner}" uses`)
  owners.set(slot, name)
}

function checkFieldType(name: string, type: FieldTypeDef, registry: Registry): void {
  const at = `Field type "${name}"`
  for (const kind of [type.kind, type.itemKind]) {
    if (typeof kind === 'string' && !lookup(registry.kinds, kind)) {
      throw new TypeError(`${at}: kind "${kind}" is not registered`)
    }
  }
  if (type.container && type.kind !== 'object' && type.kind !== 'array') {
    throw new TypeError(`${at}: a container's kind must be 'object' or 'array'`)
  }
  if (type.kind !== 'none' && !type.schema) {
    throw new TypeError(`${at}: schema() is required unless the kind is 'none'`)
  }
  rejectReservedKeys(type.props, isReservedFieldKey, `${at}: props`)

  // A kind from a function is only known per field, so checkField checks those default rules.
  if (typeof type.kind === 'string' && typeof type.itemKind !== 'function') {
    const itemKind = type.kind === 'array' ? type.itemKind : undefined
    checkDefaultRules(name, type, { kind: type.kind, itemKind }, registry)
  }
}

/** `what` names the schema in the message, e.g. `Rule "minLength": params`. */
function rejectReservedKeys(
  schema: AnyObjectSchema | undefined,
  isReserved: (key: string) => boolean,
  what: string,
): void {
  for (const key of Object.keys(schema?.entries ?? {})) {
    if (isReserved(key)) throw new TypeError(`${what} can't use the reserved key "${key}"`)
  }
}
