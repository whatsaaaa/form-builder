import * as v from 'valibot'
import type { DefinitionIssue, DefinitionPath } from '../errors/definition-error'
import type { BuildContext } from '../field-types/field-type-def'
import type { AnySchema } from '../shared/valibot-types'
import { buildFieldSchema, type Messages } from './build-field-schema'
import type { Registry } from './registry'
import { type CheckedField, checkField, toIssues } from './validate-definition'

export interface CompileResult {
  /** Every issue in the definition, in document order. */
  issues: DefinitionIssue[]
  /** The form's schema. Only complete when there are no issues. */
  schema: FieldsSchema
}

/** The schema of a list of fields: an object with a key for each field that has a value. */
export type FieldsSchema = v.ObjectSchema<v.ObjectEntries, undefined>

const formShape = v.object({ version: v.string(), fields: v.array(v.unknown()) })

/**
 * Checks a definition and builds its schema in the same pass, so `validate()` and `build()`
 * always agree. Never throws on bad input.
 */
export function compileDefinition(
  json: unknown,
  registry: Registry,
  messages: Messages,
): CompileResult {
  const issues: DefinitionIssue[] = []

  const form = v.safeParse(formShape, json)
  if (!form.success) {
    return { issues: toIssues('invalid_shape', [], form.issues), schema: v.object({}) }
  }

  if (form.output.version !== '1') {
    const message = `Unsupported version "${form.output.version}". This package reads version '1'.`
    issues.push({ code: 'unsupported_version', path: ['version'], message })
    return { issues, schema: v.object({}) }
  }

  const compiler = createCompiler(registry, messages, issues)
  return { issues, schema: compiler.fields(form.output.fields, ['fields']) }
}

export interface Compiler {
  /** Checks and builds a list of fields. `path` is where the list is, e.g. `['fields']`. */
  fields(fields: readonly unknown[], path: DefinitionPath): FieldsSchema
  /** Checks and builds the field of a list's items, which needs no name. */
  field(field: unknown, path: DefinitionPath): AnySchema
}

/** Every field the compiler checks adds its issues to `issues`. */
export function createCompiler(
  registry: Registry,
  messages: Messages,
  issues: DefinitionIssue[],
): Compiler {
  // A field type builds its child fields through these, so it never imports the builder.
  const context = (path: DefinitionPath): BuildContext => ({
    path,
    buildFields: fields,
    buildField: field,
  })

  function fields(list: readonly unknown[], path: DefinitionPath): FieldsSchema {
    const entries: v.ObjectEntries = {}
    const names = new Set<string>()
    list.forEach((raw, i) => {
      const checked = checkField(raw, [...path, i], registry, names, issues)
      if (checked?.name) entries[checked.name] = build(checked)
    })
    return v.object(entries)
  }

  function field(raw: unknown, path: DefinitionPath): AnySchema {
    const checked = checkField(raw, path, registry, undefined, issues)
    // A field with issues gets no schema. build() throws before anything parses with it.
    return checked ? build(checked) : v.never()
  }

  function build(checked: CheckedField): AnySchema {
    const schema = buildFieldSchema(checked, messages, context(checked.path))
    checkDefault(checked, schema, issues)
    return schema
  }

  return { fields, field }
}

/** A default must be a value the field accepts. An empty one is the same as none. */
function checkDefault(
  { field, kind, path }: CheckedField,
  schema: AnySchema,
  issues: DefinitionIssue[],
): void {
  if (field.default === undefined || kind.isEmpty(field.default)) return
  const result = v.safeParse(schema, field.default)
  if (!result.success) {
    issues.push(...toIssues('invalid_default', [...path, 'default'], result.issues))
  }
}
