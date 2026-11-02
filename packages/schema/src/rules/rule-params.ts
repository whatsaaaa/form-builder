import type { AnyObjectSchema } from '../shared/valibot-types'
import type { ValueKind } from '../shared/value-kind'
import type { RuleDef } from './rule-def'

const cache = new WeakMap<RuleDef, Map<ValueKind, AnyObjectSchema>>()

export function paramsFor(def: RuleDef, kind: ValueKind): AnyObjectSchema | undefined {
  if (typeof def.params !== 'function') return def.params

  let byKind = cache.get(def)

  if (!byKind) {
    byKind = new Map()
    cache.set(def, byKind)
  }

  let params = byKind.get(kind)
  if (!params) {
    params = def.params(kind)
    byKind.set(kind, params)
  }

  return params
}
