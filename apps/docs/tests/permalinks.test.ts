// The link in each heading, rendered by VitePress with the site's config as the build does. A
// screen reader reads its label, which must be the heading's text: no custom anchor, `{#id}`, and
// no backticks of code.
import { fileURLToPath } from 'node:url'
import { createMarkdownRenderer, resolveConfig } from 'vitepress'
import { describe, expect, it } from 'vitest'

const config = await resolveConfig(fileURLToPath(new URL('../', import.meta.url)), 'build')
const md = await createMarkdownRenderer(config.srcDir, config.markdown, config.site.base)

/** The id of a heading and the href and label of its link. */
function permalinkOf(heading: string) {
  const tokens = md.parse(heading, {})
  const open = tokens.find((token) => token.type === 'heading_open')
  const link = tokens
    .flatMap((token) => token.children ?? [])
    .find((token) => token.attrGet('class') === 'header-anchor')
  return {
    id: open?.attrGet('id'),
    href: link?.attrGet('href'),
    label: link?.attrGet('aria-label'),
  }
}

describe('the link in a heading', () => {
  it('is labelled with the text of a heading with no anchor of its own', () => {
    expect(permalinkOf('## Writing an extension')).toEqual({
      id: 'writing-an-extension',
      href: '#writing-an-extension',
      label: 'Permalink to "Writing an extension"',
    })
  })

  it('goes to a custom anchor without reading it out', () => {
    expect(permalinkOf('## Adding fills from an extension {#fills}')).toEqual({
      id: 'fills',
      href: '#fills',
      label: 'Permalink to "Adding fills from an extension"',
    })
  })

  it('reads code in a heading as text', () => {
    expect(permalinkOf('## What `"1"` promises').label).toBe('Permalink to "What "1" promises"')
  })
})
