import * as v from "valibot"
import type { KindDef } from "../kinds/kind-def"
import type { FieldTypeDef } from "../field-types/field-type-def"
import type { RuleDef } from "../rules/rule-def"
import { buildFieldSchema, type MessageContext, type Messages } from "./build-field-schema"
import { mergeRegistry } from "./registry"
import { checkDefinition, checkRegistry } from "./validate-definition"
import { DefinitionError, type ValidateResult } from "../errors/definition-error"
import type { JsonForm } from "../definition/json-form-schema"

export interface SchemaBuilderOptions {
  kinds?: Record<string, KindDef>
  fieldTypes?: Record<string, FieldTypeDef>
  rules?: Record<string, RuleDef>
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
    resolve: (text, ctx) => options.resolveMessage?.(text, ctx) ?? text
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

  return {
    build,
    validate,
    kinds: registry.kinds,
    fieldTypes: registry.fieldTypes,
    rules: registry.rules
  }
}
