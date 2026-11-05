import * as v from 'valibot'
import { count, countParams } from './param-schemas'
import { defineRule } from './define-rule'
import type { RuleDef } from './rule-def'

const kinds = ['string'] as const
const meta = (label: string, description?: string) =>
  ({ label, description, category: 'text' }) as const

const isLocale = (input: string) => {
  try {
    return Intl.getCanonicalLocales(input).length === 1
  } catch {
    return false
  }
}

const wordsParams = v.object({
  locale: v.optional(
    v.pipe(v.string(), v.check(isLocale, 'Use a language tag, such as en or sr-Latn')),
  ),
  value: count,
})

const graphemesInfo = 'Counts characters as people see them, so an emoji is one.'
const bytesInfo = 'Counts UTF-8 bytes, e.g. to fit a database column.'

export const textRules = {
  graphemes: defineRule({
    kinds,
    params: countParams,
    meta: meta('Exact characters', graphemesInfo),
    create: (p, m) => v.graphemes(p.value, m),
  }),
  minGraphemes: defineRule({
    kinds,
    params: countParams,
    meta: meta('Minimum characters', graphemesInfo),
    create: (p, m) => v.minGraphemes(p.value, m),
  }),
  maxGraphemes: defineRule({
    kinds,
    params: countParams,
    meta: meta('Maximum characters', graphemesInfo),
    create: (p, m) => v.maxGraphemes(p.value, m),
  }),
  notGraphemes: defineRule({
    kinds,
    params: countParams,
    meta: meta('Not this many characters', graphemesInfo),
    create: (p, m) => v.notGraphemes(p.value, m),
  }),
  words: defineRule({
    kinds,
    params: wordsParams,
    meta: meta('Exact words'),
    create: (p, m) => v.words(p.locale, p.value, m),
  }),
  minWords: defineRule({
    kinds,
    params: wordsParams,
    meta: meta('Minimum words'),
    create: (p, m) => v.minWords(p.locale, p.value, m),
  }),
  maxWords: defineRule({
    kinds,
    params: wordsParams,
    meta: meta('Maximum words'),
    create: (p, m) => v.maxWords(p.locale, p.value, m),
  }),
  notWords: defineRule({
    kinds,
    params: wordsParams,
    meta: meta('Not this many words'),
    create: (p, m) => v.notWords(p.locale, p.value, m),
  }),
  bytes: defineRule({
    kinds,
    params: countParams,
    meta: meta('Exact bytes', bytesInfo),
    create: (p, m) => v.bytes(p.value, m),
  }),
  minBytes: defineRule({
    kinds,
    params: countParams,
    meta: meta('Minimum bytes', bytesInfo),
    create: (p, m) => v.minBytes(p.value, m),
  }),
  maxBytes: defineRule({
    kinds,
    params: countParams,
    meta: meta('Maximum bytes', bytesInfo),
    create: (p, m) => v.maxBytes(p.value, m),
  }),
  notBytes: defineRule({
    kinds,
    params: countParams,
    meta: meta('Not this many bytes', bytesInfo),
    create: (p, m) => v.notBytes(p.value, m),
  }),
} satisfies Record<string, RuleDef>
