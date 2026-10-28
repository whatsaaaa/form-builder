import * as v from 'valibot'
import type { JsonFormSchema } from '../definition/json-form-schema'
import { defaultFieldTypes } from '../field-types/default-field-types'
import type { FieldTypeDef } from '../field-types/field-type-def'
import { defaultRules } from '../rules/default-rules'
import type { RuleDef } from '../rules/rule-def'
import { buildFieldSchema } from './build-field-schema'
import type { Registry } from './registry'

export interface SchemaBuilderOptions {
  fieldTypes?: Record<string, FieldTypeDef>
  rules?: Record<string, RuleDef>
}

export function createSchemaBuilder(opts: SchemaBuilderOptions = {}) {
  const registry: Registry = {
    fieldTypes: { ...defaultFieldTypes, ...opts.fieldTypes },
    rules: { ...defaultRules, ...opts.rules },
  }

  return function build(json: JsonFormSchema) {
    const entries: v.ObjectEntries = {}

    json.fields.forEach((field, i) => {
      if (field.name in entries) throw new Error(`fields[${i}]: duplicate name "${field.name}"`)
      entries[field.name] = buildFieldSchema(field, i, registry)
    })

    return v.object(entries)
  }
}
