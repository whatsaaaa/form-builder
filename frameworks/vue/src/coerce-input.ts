import type { ValueKind } from '@whatsaaaa/form-builder-schema'

/**
 * Turns what an input element gives into what the field's schema expects: `'5'` into `5` for a
 * number, and a `FileList` into a file, or an array of files for a field of kind `array`. Anything
 * else is passed through, and the schema reports it.
 */
export function coerceInput(input: unknown, kind: ValueKind, itemKind?: ValueKind): unknown {
  if (kind === 'array') {
    const items = isFileList(input) ? Array.from(input) : input
    if (!Array.isArray(items) || itemKind === undefined) return items
    return items.map((item: unknown) => coerceInput(item, itemKind))
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
 * `File` only exists in a browser, so check for it before using it, e.g. during SSR.
 */
function isFileList(value: unknown): value is ArrayLike<File> {
  if (typeof File === 'undefined' || typeof value !== 'object' || value === null) return false
  if (value instanceof File || typeof (value as ArrayLike<unknown>).length !== 'number') return false
  return Array.from(value as ArrayLike<unknown>).every((item) => item instanceof File)
}
