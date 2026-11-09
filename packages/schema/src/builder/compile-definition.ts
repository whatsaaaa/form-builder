import * as v from 'valibot'
import type { JsonField } from '../definition/json-form-schema'
import type { WalkedField } from '../definition/walk-fields'
import {
  type DefinitionIssue,
  type DefinitionPath,
  issue,
  toIssues,
} from '../errors/definition-error'
import type { BuildContext } from '../field-types/field-type-def'
import type { FormLayout } from '../render/form-layout'
import type { AnySchema } from '../shared/valibot-types'
import type { Engine } from '../visibility/engine'
import { buildFieldSchema, type MessageContext, type Messages } from './build-field-schema'
import { checkFormRules } from './check-form-rules'
import { checkLayout } from './check-layout'
import { formRuleAction, type FormRuleAction } from './form-rule-action'
import { type ExtensionRuntime, runtimeOf } from './extension-runtime'
import { lookup, type Registry } from './registry'
import { type CheckedField, checkField } from './validate-definition'

export interface CompileResult {
  /** Every issue in the definition, in document order. */
  issues: DefinitionIssue[]
  /** The form's schema. Only complete when there are no issues. */
  schema: JsonFormSchema
  /** Every field the compiler read, as `walkFields` yields them, your own containers included. */
  walked: WalkedField[]
  /** Formisch's `initialInput`, as `getInitialInput` gives it, your own containers included. */
  initialInput: Record<string, unknown>
  /** The layout, with every reference resolved. Only there when the definition has no issues. */
  layout: FormLayout | undefined
  /**
   * What the extensions' conditions hide, for each input. Only there when the builder has
   * extensions and the definition has no issues.
   */
  engine: Engine | undefined
}

/** The schema of a list of fields: an object with a key for each field that has a value. */
export type FieldsSchema = v.ObjectSchema<v.ObjectEntries, undefined>

/**
 * The schema of a definition: the object schema of its fields, in a pipe with a check for each
 * form rule when it has form rules. A new object from its `entries` leaves the form rules out, and
 * the conditions of the extensions, if any.
 */
export type JsonFormSchema =
  | FieldsSchema
  | v.SchemaWithPipe<readonly [FieldsSchema, ...FormRuleAction[]]>

const formShape = v.object({
  $schema: v.optional(v.string()),
  version: v.string(),
  fields: v.array(v.unknown()),
  formRules: v.optional(v.array(v.unknown())),
  layout: v.optional(v.unknown()),
})

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
  const empty = {
    schema: v.object({}),
    walked: [],
    initialInput: {},
    layout: undefined,
    engine: undefined,
  }

  const form = v.safeParse(formShape, json)
  if (!form.success) {
    return { ...empty, issues: toIssues('invalid_shape', [], form.issues) }
  }

  if (form.output.version !== '1') {
    const message = `Unsupported version "${form.output.version}". This package reads version '1'.`
    issues.push(issue('unsupported_version', ['version'], message))
    return { ...empty, issues }
  }

  // Like a field's, so a misspelled `formRules` isn't silently ignored.
  for (const key of Object.keys(json as object)) {
    if (!Object.hasOwn(formShape.entries, key)) {
      issues.push(issue('unknown_key', [key], `Unknown key "${key}" on the form`))
    }
  }

  // With extensions, the fields may be built again, with the messages they resolved the first time.
  const runtime = runtimeOf(registry.extensions[0])
  const resolved = runtime ? recordMessages(messages) : undefined
  const compiler = createCompiler(registry, resolved?.messages ?? messages, issues)
  const issueCount = issues.length
  const { schema, input } = compiler.list(form.output.fields, ['fields'])
  const walked = [...compiler.walked]
  // The layout places the fields that built, so it is resolved only when they have no issues.
  const fieldsBuilt = issues.length === issueCount
  const rules = checkFormRules(form.output.formRules ?? [], registry, compiler.fieldsByPath, issues)
  const layout = checkLayout(form.output.layout, fieldsBuilt ? walked : undefined, registry, issues)
  const { fieldsByPath, schemas } = compiler
  const engine = runtime?.check(registry, { walked, fieldsByPath, schemas, layout }, issues)
  const result = { issues, schema, walked, initialInput: input, layout, engine }
  if (issues.length) return { ...result, layout: undefined, engine: undefined }

  // A field conditions can hide is built again in a gate, which the root gate opens on each parse.
  // Nothing else changes: without conditions, the schema is the one built above.
  const conditional: Conditional | undefined =
    runtime && engine?.conditional ? { runtime, engine } : undefined
  const fields = conditional
    ? gatedFields(form.output.fields, registry, resolved?.replay ?? messages, conditional)
    : schema

  // Form rules run after every field's schema, on the whole value. They only check, so the schema
  // keeps the object's type, entries and output, and Formisch still keeps a field for each entry.
  const checks = rules.map((rule) => {
    const ctx = { field: rule.field, rule: rule.name, path: rule.path }
    return formRuleAction(rule, messages.resolve(rule.message, ctx))
  })
  const withRules: JsonFormSchema = checks.length ? v.pipe(fields, ...checks) : fields
  if (!conditional) return { ...result, schema: withRules }
  const { runtime: gates, engine: conditions } = conditional
  return {
    ...result,
    schema: gates.rootGate(withRules, conditions),
    // A field its conditions clear when the form starts starts blank, without its default.
    initialInput: gates.clearFields(input, conditions.evaluate(input).toClear),
  }
}

/** The fields again, each that conditions can hide in a gate. Their issues were reported. */
function gatedFields(
  fields: readonly unknown[],
  registry: Registry,
  messages: Messages,
  { runtime, engine }: Conditional,
): FieldsSchema {
  const gate: WrapField = (checked, schema) => {
    if (checked.name === undefined || !engine.canHide(checked.path)) return schema
    const container = checked.type.container === true
    const role = !container ? 'value' : checked.valueKind === 'array' ? 'array' : 'group'
    return runtime.fieldGate(schema, role)
  }
  return createCompiler(registry, messages, [], gate).fields(fields, ['fields'])
}

/** The conditions of a definition, and the runtime of its builder's extensions. */
interface Conditional {
  readonly runtime: ExtensionRuntime
  readonly engine: Engine
}

/**
 * Messages that remember what `resolveMessage` gave for each text, and the same messages again,
 * which give that back without calling it, so it sees each message once.
 */
function recordMessages(messages: Messages): { messages: Messages; replay: Messages } {
  const resolved = new Map<string, string>()
  const keyOf = (text: string, ctx: MessageContext) =>
    JSON.stringify([ctx.path, ctx.rule ?? null, text])
  return {
    messages: {
      required: messages.required,
      resolve(text, ctx) {
        const message = messages.resolve(text, ctx)
        resolved.set(keyOf(text, ctx), message)
        return message
      },
    },
    replay: {
      required: messages.required,
      resolve: (text, ctx) => resolved.get(keyOf(text, ctx)) ?? text,
    },
  }
}

export interface Compiler {
  /** Checks and builds a list of fields. `path` is where the list is, e.g. `['fields']`. */
  fields(fields: readonly unknown[], path: DefinitionPath): FieldsSchema
  /** Like `fields`, and also gives the list's initial input. */
  list(
    fields: readonly unknown[],
    path: DefinitionPath,
  ): { schema: FieldsSchema; input: Record<string, unknown> }
  /** Checks and builds the field of a list's items, which needs no name. */
  field(field: unknown, path: DefinitionPath): AnySchema
  /**
   * Checks and builds one field on its own, and gives the input a new item of it starts with when
   * it is a container of kind `array`: the input of its list of fields, or of the field of its
   * items. Undefined for any other field.
   */
  itemInput(field: unknown, path: DefinitionPath): unknown
  /**
   * Every field with a value that the compiler has seen, by where its value is, as a dot path:
   * `'address.city'`, or `'lines.*.quantity'` for the fields of a list's items. A field with
   * issues is null.
   */
  readonly fieldsByPath: ReadonlyMap<string, CheckedField | null>
  /**
   * Every field the compiler has read, in document order, with a container before its fields.
   * Display elements and fields with issues are in it too, but a container with issues isn't
   * built, so the fields inside it aren't.
   */
  readonly walked: readonly WalkedField[]
  /** The schema of each field the compiler built, without its gate. */
  readonly schemas: ReadonlyMap<CheckedField, AnySchema>
}

/**
 * Wraps the schema of a field, e.g. in a gate for the fields that conditions can hide. It gets
 * the field's schema, which is a container's too, after its fields are wrapped.
 */
export type WrapField = (checked: CheckedField, schema: AnySchema) => AnySchema

/** Every field the compiler checks adds its issues to `issues`. */
export function createCompiler(
  registry: Registry,
  messages: Messages,
  issues: DefinitionIssue[],
  wrap?: WrapField,
): Compiler {
  // A field type builds its child fields through these, so it never imports the builder.
  const context = (path: DefinitionPath): BuildContext => ({
    path,
    buildFields: fields,
    buildField: field,
  })

  const fieldsByPath = new Map<string, CheckedField | null>()
  const walked: WalkedField[] = []
  const schemas = new Map<CheckedField, AnySchema>()
  // Where the values of the child fields go, for each container whose schema() is running.
  const parents: DataPath[] = []
  const parentPath = (): DataPath => parents.at(-1) ?? []
  // The initial input of the fields each running container builds. A container of kind
  // `object` gets the input of the first list it builds.
  const childInputs: (Record<string, unknown> | undefined)[] = []
  // The input a new item starts with, for each running container: the input of the first list,
  // or field of a list's items, that it builds. Only a container of kind `array` has items.
  const itemInputs: ({ input: unknown } | undefined)[] = []

  function list(raws: readonly unknown[], path: DefinitionPath) {
    const entries: v.ObjectEntries = {}
    const input: Record<string, unknown> = {}
    const names = new Set<string>()
    raws.forEach((raw, i) => {
      const checked = checkField(raw, [...path, i], registry, names, issues)
      // A display element's name, if it has one, is no key of the value.
      const name = checked ? checked.name : hasValue(raw, registry) ? nameOf(raw) : undefined
      // A field without a name, like a heading, has its parent's path.
      const dataPath = name === undefined ? parentPath() : [...parentPath(), name]
      walk(raw, [...path, i], dataPath, checked)
      if (name === undefined) return
      remember(raw, checked, dataPath)
      if (!checked) return
      const built = build(checked, dataPath)
      entries[name] = built.schema
      if (built.input !== undefined) input[name] = built.input
    })
    keepFirst(childInputs, input)
    keepFirst(itemInputs, { input })
    return { schema: v.object(entries), input }
  }

  function fields(raws: readonly unknown[], path: DefinitionPath): FieldsSchema {
    return list(raws, path).schema
  }

  function field(raw: unknown, path: DefinitionPath): AnySchema {
    const checked = checkField(raw, path, registry, undefined, issues)
    // The field of a list's items has no name: its value is the item itself.
    const dataPath = parentPath()
    walk(raw, path, dataPath, checked)
    remember(raw, checked, dataPath)
    // A field with issues gets no schema. build() throws before anything parses with it.
    if (!checked) return v.never()
    const built = build(checked, dataPath)
    keepFirst(itemInputs, { input: built.input })
    return built.schema
  }

  function itemInput(raw: unknown, path: DefinitionPath): unknown {
    const checked = checkField(raw, path, registry, undefined, issues)
    if (!checked?.type.container || checked.valueKind !== 'array') return undefined
    return build(checked, []).itemInput
  }

  function build(checked: CheckedField, dataPath: DataPath) {
    // The fields of a list's items have no fixed index, so their paths have '*' in its place.
    parents.push(checked.valueKind === 'array' ? [...dataPath, '*'] : dataPath)
    childInputs.push(undefined)
    itemInputs.push(undefined)
    try {
      const issueCount = issues.length
      const schema = buildFieldSchema(checked, messages, context(checked.path))
      // A child field with issues is left out or built as v.never(), so the schema can't check
      // the default.
      if (issues.length === issueCount) checkDefault(checked, schema, issues)
      schemas.set(checked, schema)
      return {
        schema: wrap ? wrap(checked, schema) : schema,
        input: initialValue(checked, childInputs.at(-1)),
        itemInput: itemInputs.at(-1)?.input,
      }
    } finally {
      parents.pop()
      childInputs.pop()
      itemInputs.pop()
    }
  }

  /** Anything shaped like a field counts, so a field with issues is still walked. */
  function walk(
    raw: unknown,
    definitionPath: DefinitionPath,
    dataPath: DataPath,
    checked: CheckedField | undefined,
  ): void {
    if (!isRecord(raw) || typeof raw['type'] !== 'string') return
    const field = raw as JsonField
    walked.push({
      field,
      type: raw['type'],
      dataPath,
      definitionPath,
      depth: parents.length,
      ...kindsOf(raw, checked, registry),
    })
  }

  /** The first field at a path wins, as with duplicate names. Display elements are left out. */
  function remember(raw: unknown, checked: CheckedField | undefined, dataPath: DataPath): void {
    const key = dataPath.join('.')
    if (fieldsByPath.has(key) || (!checked && !hasValue(raw, registry))) return
    fieldsByPath.set(key, checked ?? null)
  }

  return { fields, list, field, itemInput, fieldsByPath, walked, schemas }
}

type DataPath = readonly string[]

/** Sets what the running container built first, unless it has built something already. */
function keepFirst<T>(stack: (T | undefined)[], value: T): void {
  if (stack.length && stack.at(-1) === undefined) stack[stack.length - 1] = value
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const nameOf = (raw: unknown) =>
  isRecord(raw) && typeof raw['name'] === 'string' ? raw['name'] : undefined

/** An unknown type counts as one with a value, so a form rule that reads the field is fine. */
const hasValue = (raw: unknown, registry: Registry) =>
  isRecord(raw) &&
  typeof raw['type'] === 'string' &&
  lookup(registry.fieldTypes, raw['type'])?.kind !== 'none'

/**
 * A field's kinds, as `walkFields` gives them. A field with issues has none, but a display element
 * has no value either way.
 */
function kindsOf(
  raw: unknown,
  checked: CheckedField | undefined,
  registry: Registry,
): Pick<WalkedField, 'kind' | 'itemKind'> {
  if (!checked) return hasValue(raw, registry) ? {} : { kind: 'none' }
  const { valueKind: kind, itemKind } = checked
  return itemKind === undefined ? { kind } : { kind, itemKind }
}

/**
 * A field's value in `initialInput`. A container of kind `object` gets the input of its fields,
 * one of kind `array` gets `[]` without a default, and any other field gets its default.
 */
function initialValue(
  { field, type, valueKind }: CheckedField,
  children: Record<string, unknown> | undefined,
): unknown {
  if (type.container && valueKind === 'object') return children ?? {}
  if (type.container && valueKind === 'array') return field.default ?? []
  return field.default
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
