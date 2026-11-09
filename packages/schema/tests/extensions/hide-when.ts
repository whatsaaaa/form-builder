import * as v from 'valibot'
import {
  defineExtension,
  type ExtensionTarget,
  type TargetConditions,
} from '@whatsaaaa/form-builder-schema'

/**
 * A small extension for these tests: `hideWhen: { field, equals?, clear? }` hides a field, step or
 * section while the field at `field` holds a value that isn't `false`, or `equals` when it is
 * given, and clears it too with `clear`. It shows what the builder does with any extension's
 * conditions.
 */
export interface HideWhen {
  field: string
  equals?: string | number | boolean
  clear?: boolean
}

const condition: v.GenericSchema<HideWhen> = v.strictObject({
  field: v.string(),
  equals: v.optional(v.union([v.string(), v.number(), v.boolean()])),
  clear: v.optional(v.boolean()),
})

/** The keys of `hideWhen()`. */
const propsOf = <TKey extends string>(key: TKey) =>
  v.object({ [key]: v.optional(v.lazy(() => condition)) } as Record<
    TKey,
    v.OptionalSchema<v.LazySchema<typeof condition>, undefined>
  >)

export const hideWhen = (name = 'hideWhen') => extension(name, 'hideWhen')

/** The same, with its conditions in `otherWhen`, as a second extension. */
export const otherWhen = () => extension('other', 'otherWhen')

/** The extension, named `name`, which reads its conditions from `key`. */
const extension = <TKey extends string>(name: string, key: TKey) =>
  defineExtension({
    name,
    fieldProps: propsOf(key),
    layoutProps: propsOf(key),
    definitions: { condition },
    check(ctx) {
      const found = new Map<ExtensionTarget, TargetConditions>()
      for (const target of ctx.targets) {
        const raw = target.json[key] as HideWhen | undefined
        if (raw === undefined) continue
        const at = [...target.definitionPath, key]
        if (!v.is(condition, raw)) {
          ctx.issue('invalid_shape', at, `${key} is { field, equals?, clear? }`)
          continue
        }
        const field = ctx.resolve(raw.field, target)
        if (typeof field === 'string') ctx.issue('unknown_field', [...at, 'field'], field)
        if (typeof field === 'string' || field === null) continue
        found.set(target, {
          reads: [{ field, at: [...at, 'field'] }],
          evaluate(read) {
            const value = read(0)
            const hidden =
              raw.equals === undefined
                ? value !== undefined && value !== false && !field.kindDef.isEmpty(value)
                : value === raw.equals
            return { hidden, clear: hidden && raw.clear === true }
          },
        })
      }
      return found
    },
  })
