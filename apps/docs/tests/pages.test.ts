// Checks the code the pages show, so the docs can't drift from the packages. Every JSON block that
// is a definition, or a single field, must pass `validate()`. A block after `<!-- docs: invalid -->`
// must fail it, and one after `<!-- docs: fragment -->`, like a field that reads others, is only
// parsed. The snippets the pages include with `<<<` are type-checked by `pnpm type-check`, and the
// ones in snippets/schema, which need no UI framework, run here too.
import { readdirSync, readFileSync } from 'node:fs'
import { affects } from '@whatsaaaa/form-builder-affects'
import { createSchemaBuilder, formatPath, type JsonForm } from '@whatsaaaa/form-builder-schema'
import { describe, expect, it } from 'vitest'

const root = new URL('../', import.meta.url)
const builder = createSchemaBuilder({ extensions: [affects()] })

const pages = readdirSync(root, { recursive: true, encoding: 'utf8' }).filter(
  (path) => path.endsWith('.md') && !/(^|\/)(node_modules|\.vitepress)\//.test(path),
)

interface Block {
  page: string
  line: number
  marker: string | undefined
  json: string
}

const blocks: Block[] = pages.flatMap((page) => {
  const source = readFileSync(new URL(page, root), 'utf8')
  return [
    ...source.matchAll(/(?:<!-- docs: (\w+) -->\n\n)?```json(?:[ {][^\n]*)?\n([\s\S]*?)```/g),
  ].map((match) => ({
    page,
    line: source.slice(0, match.index).split('\n').length,
    marker: match[1],
    json: match[2] ?? '',
  }))
})

/** A definition as written, a field wrapped in one, or undefined for any other piece of JSON. */
function definitionOf(value: unknown): JsonForm | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  if ('version' in value) return value as JsonForm
  const isField = 'type' in value && !('rule' in value) && !('effect' in value)
  return isField ? ({ version: '1', fields: [value] } as JsonForm) : undefined
}

describe('the JSON blocks of the pages', () => {
  it('finds the blocks', () => {
    expect(blocks.length).toBeGreaterThan(20)
  })

  it.each(blocks.map((block) => [`${block.page}:${block.line}`, block] as const))(
    '%s',
    (_, block) => {
      const value: unknown = JSON.parse(block.json)
      if (block.marker === 'fragment') return
      const definition = definitionOf(value)
      if (block.marker === 'invalid') {
        expect(definition).toBeDefined()
        expect(builder.validate(definition).success).toBe(false)
        return
      }
      expect(block.marker).toBeUndefined()
      if (definition === undefined) return
      const { issues } = builder.validate(definition)
      expect(issues.map((issue) => `${formatPath(issue.path)}: ${issue.message}`)).toEqual([])
    },
  )
})

describe('the snippets that need no UI framework', () => {
  const snippets = readdirSync(new URL('snippets/schema/', root)).filter((file) =>
    file.endsWith('.ts'),
  )

  it.each(snippets)('%s runs', async (file) => {
    await import(new URL(`snippets/schema/${file}`, root).href)
  })
})
