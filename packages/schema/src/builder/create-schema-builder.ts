import * as v from 'valibot'
import type { KindDef } from '../kinds/kind-def'
import type { FieldTypeDef } from '../field-types/field-type-def'
import type { RuleDef } from '../rules/rule-def'
import { buildFieldSchema, type MessageContext, type Messages } from './build-field-schema'
import { mergeRegistry } from './registry'
import { checkDefinition, checkRegistry } from './validate-definition'
import { DefinitionError, type ValidateResult } from '../errors/definition-error'
import type { JsonForm } from '../definition/json-form-schema'
import type { ValueKind } from '../shared/value-kind'

export interface SchemaBuilderOptions {
  kinds?: Record<string, KindDef>
  fieldTypes?: Record<string, FieldTypeDef>
  rules?: Record<string, RuleDef>
  includeDefaultRules?: boolean
  messages?: { required?: string }
  /**
   * Called with every message from the definition and with `messages.required`, e.g. to treat
   * them as i18n keys. Return undefined  to use the text as written.
   */
  resolveMessage?(key: string, ctx: MessageContext): string | undefined
}

export function createSchemaBuilder(options: SchemaBuilderOptions = {}) {
  const registry = mergeRegistry(options)
  checkRegistry(registry)

  const messages: Messages = {
    required: options.messages?.required ?? 'Required',
    resolve: (text, ctx) => options.resolveMessage?.(text, ctx) ?? text,
  }

  /** Every issue in the definition, in document order. Never throws on bad input. */
  function validate(json: unknown): ValidateResult {
    const { issues } = checkDefinition(json, registry)
    return issues.length ? { success: false, issues } : { success: true, issues: [] }
  }

  function build(json: JsonForm) {
    const { issues, fields } = checkDefinition(json, registry)
    if (issues.length) throw new DefinitionError(issues)

    const entries: v.ObjectEntries = {}
    for (const field of fields) {
      entries[field.name] = buildFieldSchema(field, messages)
    }
    return v.object(entries)
  }

  /**
   * The registered rules that can be used on a field of `kind`, e.g. for a rule picker.
   */
  function rulesForKind(kind: ValueKind): [name: string, def: RuleDef][] {
    return Object.entries(registry.rules).filter(([, def]) => def.kinds.includes(kind))
  }

  return {
    build,
    validate,
    rulesForKind,
    kinds: registry.kinds,
    fieldTypes: registry.fieldTypes,
    rules: registry.rules,
  }
}
