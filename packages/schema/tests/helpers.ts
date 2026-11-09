import * as v from 'valibot'
import { onTestFinished, vi } from 'vitest'
import type { JsonField, JsonForm } from '@whatsaaaa/form-builder-schema'

export const form = (...fields: JsonField[]): JsonForm => ({ version: '1', fields })

/** The messages Valibot reports for `input`. */
export const messages = (schema: v.GenericSchema, input: unknown) =>
  v.safeParse(schema, input).issues?.map((issue) => issue.message) ?? []

interface FileLike {
  readonly name: string
  readonly size: number
  readonly type: string
}

/**
 * A File of `size` bytes. This package's tsconfig has no DOM types, so the global is typed here.
 */
export const file = (size: number, type = 'application/octet-stream'): FileLike => {
  const { File } = globalThis as unknown as {
    File: new (bits: string[], name: string, options: { type: string }) => FileLike
  }
  return new File(['x'.repeat(size)], 'upload', { type })
}

/** Time zones west of, at and east of UTC, where a picked day must stay the same. */
export const timeZones = ['America/Los_Angeles', 'UTC', 'Pacific/Kiritimati']

/** Runs the rest of the test in `timeZone`, the way a person there would. */
export function useTimeZone(timeZone: string) {
  vi.stubEnv('TZ', timeZone)
  onTestFinished(() => {
    vi.unstubAllEnvs()
  })
}
