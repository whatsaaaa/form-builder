import type { FieldTypeDef } from '../field-types/field-type-def'
import { paramsFor } from '../rules/rule-params'
import {
  isReservedFieldKey,
  isReservedFormRuleKey,
  isReservedRuleKey,
} from '../shared/reserved-keys'
import type { AnyObjectSchema } from '../shared/valibot-types'
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
