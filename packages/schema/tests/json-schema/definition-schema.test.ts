import Ajv from 'ajv'
import { describe, expect, it } from 'vitest'
import { createSchemaBuilder } from '@whatsaaaa/form-builder-schema'
import definitionSchema from '@whatsaaaa/form-builder-schema/definition.schema.json'
import { toJsonSchema } from '@whatsaaaa/form-builder-schema/json-schema'
import { type Fixture, fixtures, formRuleFixtures, layoutFixtures } from '../fixtures'

const form = (...fields: object[]) => ({ version: '1', fields })
const layout = (value: object) => ({ ...form({ name: 'a', type: 'text' }), layout: value })

describe('definition.schema.json', () => {
  const check = new Ajv({ allErrors: true }).compile(definitionSchema)

  it('is the schema of the default registry, with its $id', () => {
    // When this fails, run `pnpm docs:gen` and commit what it writes.
    const { $id, ...generated } = definitionSchema
    expect($id).toBe('https://whatsaaaa.github.io/form-builder/schema/v1/definition.schema.json')
    expect(generated).toEqual(toJsonSchema(createSchemaBuilder()))
  })

  it.each<[string, Fixture]>([
    ...Object.entries(fixtures),
    ...Object.entries(formRuleFixtures).map(([name, fixture]): [string, Fixture] => [
      `form-rules/${name}`,
      fixture,
    ]),
    ...Object.entries(layoutFixtures).map(([name, fixture]): [string, Fixture] => [
      `layout/${name}`,
      fixture,
    ]),
  ])('accepts the %s fixture', (_, fixture: Fixture) => {
    check(fixture)
    expect(check.errors ?? []).toEqual([])
  })

  it('accepts every layout node, in a row and out of one', () => {
    const json = layout({
      ui: { steps: 'tabs' },
      steps: [
        { id: 'one', label: 'One', description: 'First', ui: {}, items: ['a'] },
        {
          items: [
            { type: 'heading', id: 'h', text: 'Hi', level: 2 },
            { type: 'section', id: 's', label: 'S', description: 'D', ui: {}, items: ['*'] },
            {
              type: 'row',
              id: 'r',
              ui: {},
              items: [
                { field: 'a', span: 4 },
                { type: 'divider', span: 2 },
                { type: 'slot', name: 'submit', span: 2 },
                { type: 'section', span: 4, items: ['a'] },
              ],
            },
          ],
        },
      ],
    })
    check(json)
    expect(check.errors ?? []).toEqual([])
  })

  it('accepts a definition that points at it with $schema', () => {
    const json = { $schema: '../definition.schema.json', ...form({ name: 'a', type: 'text' }) }
    expect(check(json)).toBe(true)
  })

  it.each([
    ['an unknown type', form({ name: 'a', type: 'emial' })],
    ['an unknown rule', form({ name: 'a', type: 'text', rules: [{ rule: 'maxLenght' }] })],
    [
      'a param of the wrong type',
      form({ name: 'a', type: 'text', rules: [{ rule: 'maxLength', value: '3' }] }),
    ],
    [
      'a rule for another kind',
      form({ name: 'a', type: 'number', rules: [{ rule: 'minLength', value: 3 }] }),
    ],
    ['an unknown key', form({ name: 'a', type: 'text', requird: true })],
    ['a missing prop', form({ name: 'a', type: 'radio' })],
    ['a value field without a name', form({ type: 'text' })],
    ['a name with a dot', form({ name: 'a.b', type: 'text' })],
    ['the name *', form({ name: '*', type: 'text' })],
    ['the name __proto__', form({ name: '__proto__', type: 'text' })],
    ['a default on a heading', form({ type: 'heading', text: 'Hi', default: 'x' })],
    ['a required group', form({ name: 'a', type: 'group', required: true, fields: [] })],
    ['rules on a heading', form({ type: 'heading', text: 'Hi', rules: [] })],
    [
      'a heading as list item',
      form({ name: 'a', type: 'array', of: { type: 'heading', text: 'Hi' } }),
    ],
    [
      'a form rule without a message',
      { ...form(), formRules: [{ rule: 'sameAs', field: 'a', other: 'b' }] },
    ],
    ['another version', { version: '2', fields: [] }],
    ['a layout with items and steps', layout({ items: ['a'], steps: [{ items: ['a'] }] })],
    ['a layout with neither', layout({ ui: {} })],
    ['an empty list of items', layout({ items: [] })],
    ['a step without items', layout({ steps: [{ label: 'One' }] })],
    [
      'an unknown key on a section',
      layout({ items: [{ type: 'section', title: 'A', items: ['a'] }] }),
    ],
    ['a value type in the layout', layout({ items: [{ type: 'text', id: 'b' }] })],
    [
      'a name on a heading in the layout',
      layout({ items: [{ type: 'heading', text: 'Hi', name: 'h' }] }),
    ],
    ['a span outside a row', layout({ items: [{ field: 'a', span: 6 }] })],
    ['a span of 13', layout({ items: [{ type: 'row', items: [{ field: 'a', span: 13 }] }] })],
    ['a span of 1.5', layout({ items: [{ type: 'row', items: [{ field: 'a', span: 1.5 }] }] })],
    ['"*" in a row', layout({ items: [{ type: 'row', items: ['a', '*'] }] })],
    ['a slot without a name', layout({ items: [{ type: 'slot' }] })],
  ])('rejects %s', (_, json) => {
    expect(check(json)).toBe(false)
  })
})
