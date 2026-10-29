import * as v from 'valibot'
import type { JsonField } from '../definition/json-form-schema'
import type { DefinitionPath } from '../errors/definition-error'
import type { CheckedField } from './validate-definition'
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
 * then the type's default rules and the field's rules.
 */
export function buildFieldSchema(checked: CheckedField, messages: Messages): AnySchema {
  const { field, path, type, kind } = checked
  const required = !!field.required
  const requiredMessage = messages.resolve(
    (typeof field.required === 'object' && field.required.message) || messages.required,
    { field, path },
  )

  const normalize: AnyAction[] = []
  const validate: AnyAction[] = []

  for (const rule of checked.rules) {
    const message =
      rule.message === undefined
        ? undefined
        : messages.resolve(rule.message, { field, rule: rule.name, path })
    const action = rule.def.create(rule.params, message)
    if (rule.def.stage === 'normalize') {
      normalize.push(action)
    } else {
      validate.push(action)
    }
  }

  const base = (type.schema as NonNullable<typeof type.schema>)(field, { path })
  const requiredCheck = required ? kind.required?.(requiredMessage) : undefined
  const head = pipe(base, requiredCheck ? [...normalize, requiredCheck] : normalize)

  const empty = required
    ? v.never(requiredMessage)
    : v.pipe(
        v.unknown(),
        v.transform(() => undefined),
      )

  const whenFilled = (schema: AnySchema): AnySchema =>
    v.lazy((input) => (kind.isEmpty(input) ? empty : schema))

  const schema = whenFilled(v.pipe(head, whenFilled(pipe(v.unknown(), validate))))

  return required ? schema : v.optional(schema)
}

const pipe = (schema: AnySchema, actions: readonly AnyAction[]): AnySchema =>
  actions.reduce<AnySchema>((acc, action) => v.pipe(acc, action), schema)
