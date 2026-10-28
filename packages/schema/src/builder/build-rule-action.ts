import * as v from 'valibot'
import type { JsonRule } from '../definition/json-form-schema'
import type { AnyAction } from '../shared/valibot-types'
import type { ValueKind } from '../shared/value-kind'
import type { Registry } from './registry'

export function buildRuleAction(
  rule: JsonRule,
  kind: ValueKind,
  registry: Registry,
  at: string,
): AnyAction {
  const def = registry.rules[rule.rule]
  if (!def) throw new Error(`${at}: unknown rule "${rule.rule}"`)
  if (!def.kinds.includes(kind))
    throw new Error(`${at}: rule "${rule.rule}" can't be used on ${kind} fields`)

  const parsed = v.safeParse(def.params, rule)
  if (!parsed.success)
    throw new Error(`${at}: invalid params for "${rule.rule}"\n${v.summarize(parsed.issues)}`)

  return def.create(parsed.output, rule.message)
}
