import * as v from 'valibot'
import { defineRule } from './define-rule'
import { countParams } from './param-schemas'
import type { RuleDef } from './rule-def'

const kinds = ['file'] as const
const meta = (label: string, description?: string) =>
  ({ label, description, category: 'file' }) as const
const bytes = 'In bytes, e.g. 1048576 for 1 MiB.'

type MimeType = `${string}/${string}`

// A File only carries its MIME type, and Valibot compares it exactly, so image/* can't work.
const mimeTypeParams = v.object({
  types: v.pipe(
    v.array(
      v.pipe(v.string(), v.regex(/^[\w.+-]+\/[\w.+-]+$/, 'Use a MIME type, such as image/png')),
    ),
    v.minLength(1, 'Give at least one MIME type'),
  ),
})

/** Size and type of a File or Blob. */
export const fileRules = {
  minSize: defineRule({
    kinds,
    params: countParams,
    meta: meta('Minimum size', bytes),
    create: (p, m) => v.minSize(p.value, m),
  }),
  maxSize: defineRule({
    kinds,
    params: countParams,
    meta: meta('Maximum size', bytes),
    create: (p, m) => v.maxSize(p.value, m),
  }),
  size: defineRule({
    kinds,
    params: countParams,
    meta: meta('Exact size', bytes),
    create: (p, m) => v.size(p.value, m),
  }),
  notSize: defineRule({
    kinds,
    params: countParams,
    meta: meta('Not this size', bytes),
    create: (p, m) => v.notSize(p.value, m),
  }),
  mimeType: defineRule({
    kinds,
    params: mimeTypeParams,
    meta: meta('File type'),
    create: (p, m) => v.mimeType(p.types as MimeType[], m),
  }),
} satisfies Record<string, RuleDef>
