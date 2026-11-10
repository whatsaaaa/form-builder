import type { SchemaExtension } from '../extensions/schema-extension'
import { defaultFieldTypes } from '../field-types/default-field-types'
import type { FieldTypeDef } from '../field-types/field-type-def'
import { defaultKinds } from '../kinds/default-kinds'
import type { KindDef } from '../kinds/kind-def'
import { defaultRules } from '../rules/default-rules'
import type { FormRuleDef } from '../rules/form-rule-def'
import { defaultFormRules } from '../rules/form-rules'
import type { RuleDef } from '../rules/rule-def'

export interface Registry {
  readonly kinds: Readonly<Record<string, KindDef>>
  readonly fieldTypes: Readonly<Record<string, FieldTypeDef>>
  readonly rules: Readonly<Record<string, RuleDef>>
  readonly formRules: Readonly<Record<string, FormRuleDef>>
  readonly extensions: readonly SchemaExtension[]
}

export interface RegistryOptions extends Partial<Registry> {
  /** With false, only the consumer's own rules and form rules are registered. Defaults to true. */
  includeDefaultRules?: boolean
}

/** Consumer entries replace defaults with the same key. */
export function mergeRegistry(custom: RegistryOptions): Registry {
  const defaults = custom.includeDefaultRules !== false
  return {
    kinds: Object.freeze({ ...defaultKinds, ...custom.kinds }),
    fieldTypes: Object.freeze({ ...defaultFieldTypes, ...custom.fieldTypes }),
    rules: Object.freeze({ ...(defaults ? defaultRules : {}), ...custom.rules }),
    formRules: Object.freeze({ ...(defaults ? defaultFormRules : {}), ...custom.formRules }),
    extensions: Object.freeze([...(custom.extensions ?? [])]),
  }
}

/** True for a key an extension adds to fields, like `affects`. */
export const isExtensionFieldKey = (registry: Registry, key: string): boolean =>
  registry.extensions.some((extension) => Object.hasOwn(extension.fieldProps?.entries ?? {}, key))

export function lookup<T>(record: Readonly<Record<string, T>>, key: string): T | undefined {
  return Object.hasOwn(record, key) ? record[key] : undefined
}
