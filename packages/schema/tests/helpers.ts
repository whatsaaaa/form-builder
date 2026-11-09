import * as v from 'valibot'
import { onTestFinished, vi } from 'vitest'
import type { JsonField, JsonForm, LayoutNode } from '@whatsaaaa/form-builder-schema'

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

/**
 * A layout tree as text, one line per node, indented by depth: a field by its dot path, or its
 * type when it has none, a section or row by its type and `id`, a slot by its name. A span other
 * than 12 follows a colon: `email:6`.
 */
export function outline(nodes: readonly LayoutNode[], depth = 0): string[] {
  return nodes.flatMap((node) => {
    const name =
      node.type === 'field'
        ? node.node.field.name === undefined
          ? node.node.type
          : node.node.dataPath.join('.')
        : node.type === 'slot'
          ? `slot ${node.name}`
          : [node.type, node.type === 'section' ? node.section.id : node.row.id]
              .filter(Boolean)
              .join(' ')
    const line = `${'  '.repeat(depth)}${name}${node.span === 12 ? '' : `:${node.span}`}`
    return [line, ...(node.type === 'slot' ? [] : outline(node.children, depth + 1))]
  })
}
