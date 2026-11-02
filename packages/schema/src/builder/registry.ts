import { defaultFieldTypes } from '../field-types/default-field-types'
import type { FieldTypeDef } from '../field-types/field-type-def'
import { defaultKinds } from '../kinds/default-kinds'
import type { KindDef } from '../kinds/kind-def'
import { defaultRules } from '../rules/default-rules'
import type { RuleDef } from '../rules/rule-def'

export interface Registry {
  readonly kinds: Readonly<Record<string, KindDef>>
  readonly fieldTypes: Readonly<Record<string, FieldTypeDef>>
  readonly rules: Readonly<Record<string, RuleDef>>
}

export interface RegistryOptions extends Partial<Registry> {
  /** With false, only the consumer's own rules are registered. Defaults to true. */
  includeDefaultRules?: boolean
}

/** Consumer entries replace defaults with the same key. */
export function mergeRegistry(custom: RegistryOptions): Registry {
  const rules = custom.includeDefaultRules === false ? {} : defaultRules
  return {
    kinds: Object.freeze({ ...defaultKinds, ...custom.kinds }),
    fieldTypes: Object.freeze({ ...defaultFieldTypes, ...custom.fieldTypes }),
    rules: Object.freeze({ ...rules, ...custom.rules }),
  }
}

export function lookup<T>(record: Readonly<Record<string, T>>, key: string): T | undefined {
  return Object.hasOwn(record, key) ? record[key] : undefined
}
