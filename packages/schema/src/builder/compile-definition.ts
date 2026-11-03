import * as v from 'valibot'
import type { DefinitionIssue, DefinitionPath } from '../errors/definition-error'
import type { BuildContext } from '../field-types/field-type-def'
import type { AnySchema } from '../shared/valibot-types'
import { buildFieldSchema, type Messages } from './build-field-schema'
import { lookup, type Registry } from './registry'
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
  /**
   * Every field with a value that the compiler has seen, by where its value is, as a dot path:
   * `'address.city'`, or `'lines.*.quantity'` for the fields of a list's items. A field with
   * issues is null.
   */
  readonly fieldsByPath: ReadonlyMap<string, CheckedField | null>
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

  const fieldsByPath = new Map<string, CheckedField | null>()
  // Where the values of the child fields go, for each container whose schema() is running.
  const parents: DataPath[] = []
  const parentPath = (): DataPath => parents.at(-1) ?? []

  function fields(list: readonly unknown[], path: DefinitionPath): FieldsSchema {
    const entries: v.ObjectEntries = {}
    const names = new Set<string>()
    list.forEach((raw, i) => {
      const checked = checkField(raw, [...path, i], registry, names, issues)
      const name = checked ? checked.name : nameOf(raw)
      if (name === undefined) return
      const dataPath = [...parentPath(), name]
      remember(raw, checked, dataPath)
      if (checked) entries[name] = build(checked, dataPath)
    })
    return v.object(entries)
  }

  function field(raw: unknown, path: DefinitionPath): AnySchema {
    const checked = checkField(raw, path, registry, undefined, issues)
    // The field of a list's items has no name: its value is the item itself.
    const dataPath = parentPath()
    remember(raw, checked, dataPath)
    // A field with issues gets no schema. build() throws before anything parses with it.
    return checked ? build(checked, dataPath) : v.never()
  }

  function build(checked: CheckedField, dataPath: DataPath): AnySchema {
    // The fields of a list's items have no fixed index, so their paths have '*' in its place.
    parents.push(checked.valueKind === 'array' ? [...dataPath, '*'] : dataPath)
    try {
      const schema = buildFieldSchema(checked, messages, context(checked.path))
      checkDefault(checked, schema, issues)
      return schema
    } finally {
      parents.pop()
    }
  }

  /** The first field at a path wins, as with duplicate names. Display elements are left out. */
  function remember(raw: unknown, checked: CheckedField | undefined, dataPath: DataPath): void {
    const key = dataPath.join('.')
    if (fieldsByPath.has(key) || (!checked && !hasValue(raw, registry))) return
    fieldsByPath.set(key, checked ?? null)
  }

  return { fields, field, fieldsByPath }
}

type DataPath = readonly string[]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const nameOf = (raw: unknown) =>
  isRecord(raw) && typeof raw.name === 'string' ? raw.name : undefined

/** An unknown type counts as one with a value, so a form rule that reads the field is fine. */
const hasValue = (raw: unknown, registry: Registry) =>
  isRecord(raw) &&
  typeof raw.type === 'string' &&
  lookup(registry.fieldTypes, raw.type)?.kind !== 'none'

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
