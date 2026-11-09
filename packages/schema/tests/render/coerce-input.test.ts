import { describe, expect, it } from 'vitest'
import { coerceInput, type ValueKind } from '@whatsaaaa/form-builder-schema'
import { file } from '../helpers'

/** A FileList as a browser gives it: an array-like of files that isn't an array. */
const fileList = (...files: unknown[]): ArrayLike<unknown> =>
  Object.assign(Object.create(null) as object, { ...files, length: files.length })

const coerce = (input: unknown, kind: ValueKind, itemKind?: ValueKind) =>
  coerceInput(input, { kind, itemKind })

describe('coerceInput', () => {
  it('turns a numeric string into a number for a number field', () => {
    expect(coerce('5', 'number')).toBe(5)
    expect(coerce('-2.5', 'number')).toBe(-2.5)
    expect(coerce('1e3', 'number')).toBe(1000)
  })

  it('turns an empty string into no value for a number field', () => {
    expect(coerce('', 'number')).toBe(undefined)
    expect(coerce('  ', 'number')).toBe(undefined)
  })

  it('keeps a string that is not a number, for the schema to report', () => {
    expect(coerce('abc', 'number')).toBe('abc')
  })

  it('keeps what is already a value of the kind', () => {
    expect(coerce(5, 'number')).toBe(5)
    expect(coerce(false, 'boolean')).toBe(false)
    expect(coerce(undefined, 'number')).toBe(undefined)
  })

  it('keeps strings for every other kind', () => {
    expect(coerce('5', 'string')).toBe('5')
    expect(coerce('2026-10-28', 'date')).toBe('2026-10-28')
    expect(coerce('true', 'boolean')).toBe('true')
  })

  it('turns each item by the kind of the items, for a field of kind array', () => {
    expect(coerce(['1', '2'], 'array', 'number')).toEqual([1, 2])
    expect(coerce(['1', ''], 'array', 'number')).toEqual([1, undefined])
    expect(coerce(['a', 'b'], 'array', 'string')).toEqual(['a', 'b'])
    expect(coerce(['1'], 'array')).toEqual(['1'])
    expect(coerce('1', 'array', 'number')).toBe('1')
  })

  it('takes a FieldNode, whose itemKind can be undefined', () => {
    const node = { kind: 'array', itemKind: undefined } as const
    expect(coerceInput(['1'], node)).toEqual(['1'])
  })

  it('takes the first file of a FileList for a single file field', () => {
    const a = file(1)
    const b = file(2)

    expect(coerce(fileList(a, b), 'file')).toBe(a)
    expect(coerce(fileList(), 'file')).toBe(undefined)
  })

  it('takes every file of a FileList for a field of kind array', () => {
    const a = file(1)
    const b = file(2)

    expect(coerce(fileList(a, b), 'array', 'file')).toEqual([a, b])
    expect(coerce([a, b], 'array', 'file')).toEqual([a, b])
    expect(coerce(fileList(), 'array', 'file')).toEqual([])
  })

  it('keeps a single file, and an array-like that holds anything but files', () => {
    const a = file(1)
    const notFiles = fileList('a.txt')

    expect(coerce(a, 'file')).toBe(a)
    expect(coerce(notFiles, 'file')).toBe(notFiles)
    expect(coerce({ length: 'x' }, 'file')).toEqual({ length: 'x' })
    expect(coerce(null, 'file')).toBe(null)
  })

  it('keeps a FileList for a kind that holds no files, for the schema to report', () => {
    const files = fileList(file(1))
    expect(coerce(files, 'string')).toBe(files)
  })

  it('works without a File global, as in SSR on old runtimes', () => {
    const File: unknown = Reflect.get(globalThis, 'File')
    Reflect.deleteProperty(globalThis, 'File')
    try {
      const list = { 0: 'a', length: 1 }
      expect(coerce('5', 'number')).toBe(5)
      expect(coerce(list, 'file')).toBe(list)
      expect(coerce(['1'], 'array', 'number')).toEqual([1])
    } finally {
      Reflect.set(globalThis, 'File', File)
    }
  })
})
