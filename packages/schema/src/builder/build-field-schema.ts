import * as v from 'valibot'
import type { JsonField } from '../definition/json-form-schema'
import type { DefinitionPath } from '../errors/definition-error'
import type { BuildContext } from '../field-types/field-type-def'
import type { RuleStage } from '../rules/rule-def'
import { eachItem } from '../shared/each-item'
import type { AnyAction, AnySchema } from '../shared/valibot-types'
import type { CheckedField } from './validate-definition'

export interface MessageContext {
  field: JsonField
  rule?: string
  path: DefinitionPath
}

export interface Messages {
  required: string
  resolve(text: string, ctx: MessageContext): string
}

/** An action, or a schema that runs on the value so far, e.g. on each item of an array. */
type PipeItem = AnyAction | AnySchema

/**
 * The schema runs in this order: empty check, base schema, normalize rules, required check,
 * then the type's default rules and the field's rules, and last the type's `finalize()`.
 * A container has no empty check: its value is never empty. The field's label and description
 * go on the outside as metadata.
 */
export function buildFieldSchema(
  checked: CheckedField,
  messages: Messages,
  ctx: BuildContext,
): AnySchema {
  const { field, path, type, kind, valueKind } = checked
  // Undefined for a field that isn't required, so resolveMessage only sees messages in use.
  const requiredMessage = field.required
    ? messages.resolve(
        (typeof field.required === 'object' && field.required.message) || messages.required,
        { field, path },
      )
    : undefined
  const required = requiredMessage !== undefined

  const rules = ruleActions(checked, messages)
  const finalize = type.finalize?.(field)
  if (finalize) rules.validate.push(finalize)

  // checkRegistry makes sure that every type with a value has a schema().
  const base = (type.schema as NonNullable<typeof type.schema>)(field, ctx)
  const requiredCheck = required ? requiredCheckOf(checked, requiredMessage) : undefined
  const head = pipe(base, requiredCheck ? [...rules.normalize, requiredCheck] : rules.normalize)

  if (type.container) {
    // Formisch reads the object or array schema to keep a field for each child, so nothing may
    // wrap it but optional. A missing value is read as an empty one, and the rules still run.
    // They sit in a nested pipe, so an empty required list reports only the required message.
    const validate = rules.validate.length ? [pipe(v.unknown(), rules.validate)] : []
    const schema = v.optional(pipe(head, validate), valueKind === 'object' ? () => ({}) : () => [])
    return withMetadata(schema, field, path, messages)
  }

  const empty = required
    ? v.never(requiredMessage)
    : v.pipe(
        v.unknown(),
        v.transform(() => undefined),
      )

  const whenFilled = (schema: AnySchema) => unlessEmpty(schema, kind.isEmpty, empty)

  // The value is checked for emptiness as it comes in, and again after the normalize rules, so
  // '   ' with trim counts as empty too.
  const schema = whenFilled(v.pipe(head, whenFilled(pipe(v.unknown(), rules.validate))))

  // Formisch starts a field inside optional without a value, but a required string field outside
  // it with ''. So a required field is inside optional too, to start the same as one that isn't,
  // and nonOptional reports a missing value with the required message.
  return withMetadata(
    required ? v.nonOptional(v.optional(schema), requiredMessage) : v.optional(schema),
    field,
    path,
    messages,
  )
}

/**
 * Runs `schema` on a value that isn't empty, and `empty` on one that is. It works like
 * `v.lazy((input) => (isEmpty(input) ? empty : schema))`, but it has the type and keys of `schema`,
 * the way `v.pipe()` has those of its first schema. Formisch reads them to make a field's store:
 * an array schema makes a multiselect an array of choices. Formisch for Qwik doesn't take
 * `v.lazy` at all.
 */
function unlessEmpty(
  schema: AnySchema,
  isEmpty: (input: unknown) => boolean,
  empty: AnySchema,
): AnySchema {
  const either: AnySchema = {
    ...schema,
    '~run': (dataset, config) => (isEmpty(dataset.value) ? empty : schema)['~run'](dataset, config),
  }
  // The pipe gives it the Standard Schema props of its own `~run`.
  return v.pipe(either)
}

/**
 * The actions of the field's rules, by stage. Rules that run on each item of an array value
 * come before the rules for the whole array.
 */
function ruleActions(checked: CheckedField, messages: Messages): Record<RuleStage, PipeItem[]> {
  const { field, path } = checked
  const whole: Record<RuleStage, PipeItem[]> = { normalize: [], validate: [] }
  const each: Record<RuleStage, AnyAction[]> = { normalize: [], validate: [] }

  for (const rule of checked.rules) {
    const message =
      rule.message === undefined
        ? undefined
        : messages.resolve(rule.message, { field, rule: rule.name, path })
    const action = rule.def.create(rule.params, message)
    const stage = rule.def.stage ?? 'validate'
    if (rule.each) {
      each[stage].push(action)
    } else {
      whole[stage].push(action)
    }
  }

  if (each.normalize.length) {
    whole.normalize.unshift(v.array(pipe(v.unknown(), each.normalize)))
  }
  if (each.validate.length) {
    whole.validate.unshift(eachItem(pipe(v.unknown(), each.validate)))
  }
  return whole
}

/**
 * Checks that a required field has a value, after the normalize rules ran. The type can replace
 * the kind's check, e.g. a yes/no radio accepts false. Null or undefined when there is none.
 */
function requiredCheckOf(
  { type, kind }: CheckedField,
  message: string,
): AnyAction | null | undefined {
  return type.required ? type.required(message) : kind.required?.(message)
}

/**
 * Adds the label as `v.title()` and the description as `v.description()`, after
 * `resolveMessage`, so `v.getTitle()` and JSON Schema converters can read them. They only
 * describe the value, so the schema still parses the same way, and Formisch still sees the
 * object, array or optional schema inside.
 */
function withMetadata(
  schema: AnySchema,
  field: JsonField,
  path: DefinitionPath,
  messages: Messages,
): AnySchema {
  const metadata: AnyAction[] = []
  if (field.label) metadata.push(v.title(messages.resolve(field.label, { field, path })))
  if (field.description) {
    metadata.push(v.description(messages.resolve(field.description, { field, path })))
  }
  return pipe(schema, metadata)
}

const pipe = (schema: AnySchema, items: readonly PipeItem[]): AnySchema =>
  items.reduce<AnySchema>((acc, item) => v.pipe(acc, item), schema)
