import * as v from 'valibot'
import type {
  DefinitionPath,
  FieldNode,
  FillContext,
  FillResult,
  FillsForm,
  FillTriggerValue,
  JsonForm,
  OpenFillsOptions,
  ResolvedField,
  SchemaBuilder,
  SchemaExtension,
} from '@whatsaaaa/form-builder-schema'

/**
 * A small extension for these tests: `prefill: { map }` or `prefill: { source, fields }` fills
 * fields when the field it is on gets a value, with `overwrite` like the fills package's. It shows
 * what the builder does with any extension's fills.
 */
export interface Prefill {
  map?: Record<string, Record<string, unknown>>
  source?: string
  fields?: string[]
  overwrite?: 'unedited' | 'always'
}

export type Source = (
  value: FillTriggerValue,
  ctx: FillContext & { readonly trigger: string },
) => FillResult | PromiseLike<FillResult>

const shape: v.GenericSchema<Prefill> = v.strictObject({
  map: v.optional(v.record(v.string(), v.record(v.string(), v.unknown()))),
  source: v.optional(v.string()),
  fields: v.optional(v.array(v.string())),
  overwrite: v.optional(v.picklist(['unedited', 'always'])),
})

/** The extension, which reads `key` and runs the sources it is given by name. */
export const prefill = <TKey extends string = 'prefill'>(
  sources: Readonly<Record<string, Source>> = {},
  key = 'prefill' as TKey,
) =>
  ({
    name: key,
    fieldProps: v.object({ [key]: v.optional(v.lazy(() => shape)) } as Record<
      TKey,
      v.OptionalSchema<v.LazySchema<typeof shape>, undefined>
    >),
    check(ctx) {
      for (const target of ctx.targets) {
        const raw = target.json[key]
        if (raw === undefined || target.kind !== 'field') continue
        const at = [...target.definitionPath, key]
        if (!v.is(shape, raw)) {
          ctx.issue('invalid_shape', at, `${key} is { map } or { source, fields }`)
          continue
        }
        const { map, source } = raw
        if (source !== undefined && !Object.hasOwn(sources, source)) {
          ctx.issue('unknown_source', [...at, 'source'], `Unknown source "${source}"`)
          continue
        }
        // Each path once, where it is first named.
        const named = new Map<string, DefinitionPath>()
        for (const [value, entry] of Object.entries(map ?? {})) {
          for (const path of Object.keys(entry)) {
            if (!named.has(path)) named.set(path, [...at, 'map', value, path])
          }
        }
        raw.fields?.forEach((path, i) => named.set(path, [...at, 'fields', i]))
        const fields: { field: ResolvedField; at: DefinitionPath }[] = []
        for (const [path, where] of named) {
          const field = ctx.resolve(path, target)
          if (typeof field === 'string') ctx.issue('unknown_field', where, field)
          else if (field) fields.push({ field, at: where })
        }
        if (fields.length !== named.size) continue
        const trigger = target.field.dataPath.join('.')
        ctx.fill(target, {
          fields,
          overwrite: raw.overwrite ?? 'unedited',
          static: map !== undefined,
          values: map
            ? (value) => map[String(value)] ?? null
            : (value, fill) => (sources[source as string] as Source)(value, { ...fill, trigger }),
        })
      }
      return new Map()
    },
  }) satisfies SchemaExtension

/** A promise to settle by hand. */
export function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

/** `input` with `value` at `path`, copied on the way. */
export function setIn(input: unknown, path: readonly (string | number)[], value: unknown): unknown {
  const [key, ...rest] = path
  if (key === undefined) return value
  const copy = { ...(input as Record<string, unknown>) }
  copy[key] = setIn(copy[key], rest, value)
  return copy
}

export interface TestFormOptions extends OpenFillsOptions {
  /**
   * Calls `update()` from inside each `setInput`, like an adapter that watches the input
   * synchronously, instead of only after `type()`.
   */
  readonly watchSync?: boolean
  /**
   * Blanks what the conditions clear only on `clear()`, like an adapter that does it in a watch
   * after the change, instead of in each `setInput`.
   */
  readonly clearLater?: boolean
}

/**
 * A form in memory, like Formisch's, with the definition's fills open on it. It starts with the
 * builder's initial input, with `given` over it as the adapters merge it, and blanks what the
 * conditions clear with each change, or only on `clear()` with `clearLater`. `log` lists every
 * input the fills set: `set` for a change, `start` for an input the form starts with.
 */
export function openForm(
  builder: SchemaBuilder,
  json: JsonForm,
  { watchSync = false, clearLater = false, ...options }: TestFormOptions = {},
) {
  const fills = builder.getFills(json)
  const visibility = builder.getVisibility(json)
  const { given } = options
  let input: unknown =
    given === undefined
      ? builder.getInitialInput(json)
      : visibility.clear(fills.initialInput(mergeFields(builder.getFieldTree(json), given), given))
  const log: string[] = []
  const cleared = (next: unknown) => (clearLater ? next : visibility.clear(next))
  const write = (kind: string, path: readonly (string | number)[], value: unknown) => {
    // Fills that set each other's fields forever fail the test instead of hanging it.
    if (log.length >= 1000) throw new Error('The fills set inputs in a loop')
    input = cleared(setIn(input, path, value))
    log.push(`${kind} ${path.join('.')} ${JSON.stringify(value) ?? 'undefined'}`)
  }
  const form: FillsForm = {
    getInput: () => input,
    setInput(path, value) {
      write('set', path, value)
      if (watchSync) run.update()
    },
    setStartInput: (path, value) => write('start', path, value),
  }
  const run = fills.open(form, options)
  return {
    fills,
    run,
    log,
    get input() {
      return input as Record<string, unknown>
    },
    /** Sets a field as the user would, then tells the fills. */
    type(path: string, value: unknown) {
      input = cleared(setIn(input, path.split('.'), value))
      run.update()
    },
    /** Blanks what the conditions clear, as an adapter's watch does, then tells the fills. */
    clear() {
      input = visibility.clear(input)
      run.update()
    },
  }
}

/** The defaults with `given` over them, as the adapters merge them, for groups and plain fields. */
function mergeFields(nodes: readonly FieldNode[], given: unknown): Record<string, unknown> {
  const record = (typeof given === 'object' && given !== null ? given : {}) as Record<
    string,
    unknown
  >
  const input = { ...record }
  for (const node of nodes) {
    if (node.role === 'display') continue
    const key = node.dataPath.at(-1) as string
    if (node.role === 'group') input[key] = mergeFields(node.children, record[key])
    else if (!Object.hasOwn(record, key) && node.field.default !== undefined) {
      input[key] = node.field.default
    }
  }
  return input
}
