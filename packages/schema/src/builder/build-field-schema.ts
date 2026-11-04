import * as v from 'valibot'
import type { JsonField } from '../definition/json-form-schema'
import type { DefinitionPath } from '../errors/definition-error'
import type { BuildContext } from '../field-types/field-type-def'
import type { RuleStage } from '../rules/rule-def'
import type { CheckedField } from './validate-definition'
import { eachItem } from '../shared/each-item'
import type { AnyAction, AnySchema } from '../shared/valibot-types'

export interface MessageContext {
  field: JsonField
  rule?: string
  path: DefinitionPath
}

export interface Messages {
  required: string
  resolve(text: string, ctx: MessageContext): string
}

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
  const required = !!field.required
  const requiredMessage = messages.resolve(
    (typeof field.required === 'object' && field.required.message) || messages.required,
    { field, path },
  )

  // Rules for a whole value, and rules that run on each item of an array value.
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

  // Item rules run before the rules for the whole array.
  if (each.normalize.length) {
    whole.normalize.unshift(v.array(pipe(v.unknown(), each.normalize)))
  }
  if (each.validate.length) {
    whole.validate.unshift(eachItem(pipe(v.unknown(), each.validate)))
  }

  const finalize = type.finalize?.(field)
  if (finalize) whole.validate.push(finalize)

  const base = (type.schema as NonNullable<typeof type.schema>)(field, ctx)
  // The type can replace the kind's required check, e.g. a yes/no radio accepts false.
  const requiredCheck = !required
    ? undefined
    : type.required
      ? type.required(requiredMessage)
      : kind.required?.(requiredMessage)
  const head = pipe(base, requiredCheck ? [...whole.normalize, requiredCheck] : whole.normalize)

  if (type.container) {
    // Formisch reads the object or array schema to keep a field for each child, so nothing may
    // wrap it but optional. A missing value is read as an empty one, and the rules still run.
    // They sit in a nested pipe, so an empty required list reports only the required message.
    const rules = whole.validate.length ? [pipe(v.unknown(), whole.validate)] : []
    const schema = v.optional(pipe(head, rules), valueKind === 'object' ? () => ({}) : () => [])
    return withMetadata(schema, field, path, messages)
  }

  const empty = required
    ? v.never(requiredMessage)
    : v.pipe(
        v.unknown(),
        v.transform(() => undefined),
      )

  const whenFilled = (schema: AnySchema): AnySchema =>
    v.lazy((input) => (kind.isEmpty(input) ? empty : schema))

  const schema = whenFilled(v.pipe(head, whenFilled(pipe(v.unknown(), whole.validate))))

  return withMetadata(required ? schema : v.optional(schema), field, path, messages)
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

/** An action, or a schema that runs on the value so far, e.g. on each item of an array. */
type PipeItem = AnyAction | AnySchema

const pipe = (schema: AnySchema, items: readonly PipeItem[]): AnySchema =>
  items.reduce<AnySchema>((acc, item) => v.pipe(acc, item), schema)
