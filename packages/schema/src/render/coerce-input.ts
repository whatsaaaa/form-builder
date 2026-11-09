import type { ValueKind } from '../shared/value-kind'

/**
 * Turns what an input element gives into what a field's schema expects, by the field's kind:
 * `'5'` into `5` and `''` into undefined for a number, and a `FileList` into a file, or an array
 * of files for a field of kind `array`. The items of an array are turned by `itemKind`, so
 * `['1', '2']` becomes `[1, 2]` for a multiselect with number options. Anything else is passed
 * through, and the schema reports it. `field` is a `FieldNode`, or anything with its kinds.
 */
export function coerceInput(
  input: unknown,
  field: { readonly kind: ValueKind; readonly itemKind?: ValueKind | undefined },
): unknown {
  return coerce(input, field.kind, field.itemKind)
}

function coerce(input: unknown, kind: ValueKind, itemKind?: ValueKind): unknown {
  if (kind === 'array') {
    const items = isFileList(input) ? Array.from(input) : input
    if (!Array.isArray(items) || itemKind === undefined) return items
    return items.map((item: unknown) => coerce(item, itemKind))
  }
  if (isFileList(input)) return kind === 'file' ? (input[0] ?? undefined) : input
  if (kind === 'number' && typeof input === 'string') return toNumber(input)
  return input
}

/** An empty string means no value. One that isn't a number stays a string, for the schema. */
function toNumber(input: string): number | string | undefined {
  if (input.trim() === '') return undefined
  const number = Number(input)
  return Number.isNaN(number) ? input : number
}

/**
 * A `FileList`, or anything shaped like one: an array-like whose items are all files. Checked by
 * shape rather than with `instanceof FileList`, because a `File[]` from a component that spread the
 * list, or from a DOM shim like happy-dom whose `DataTransfer.files` is an array, should count too.
 */
function isFileList(value: unknown): value is ArrayLike<unknown> {
  const File = fileClass()
  if (File === undefined || typeof value !== 'object' || value === null) return false
  if (value instanceof File || typeof (value as ArrayLike<unknown>).length !== 'number') {
    return false
  }
  return Array.from(value as ArrayLike<unknown>).every((item) => item instanceof File)
}

/**
 * The `File` global, read on each call: it doesn't exist everywhere, e.g. during SSR on old
 * runtimes, and the package must still load there.
 */
const fileClass = () => (globalThis as { File?: new (...args: never[]) => object }).File
