import { describe, expect, it } from 'vitest'
import { createSchemaBuilder } from '@whatsaaaa/form-builder-schema'
import { form } from '../helpers'

const { build, validate } = createSchemaBuilder()

const issues = (json: unknown) => validate(json).issues.map(({ code, path }) => ({ code, path }))

describe('display types', () => {
  it('build without a name and add no output key', () => {
    const schema = build(
      form(
        { type: 'heading', text: 'About you', level: 3 },
        { type: 'paragraph', text: 'We only use this to reply.' },
        { type: 'divider' },
        { name: 'a', type: 'text' },
      ),
    )

    expect(Object.keys(schema.entries)).toEqual(['a'])
  })

  it('reports rules and required on a heading as invalid_shape', () => {
    expect(issues(form({ type: 'heading', text: 'Hi', rules: [], required: true }))).toEqual([
      { code: 'invalid_shape', path: ['fields', 0, 'required'] },
      { code: 'invalid_shape', path: ['fields', 0, 'rules'] },
    ])
  })

  it('checks their props', () => {
    expect(
      issues(
        form(
          { type: 'heading' },
          { type: 'heading', text: 'Hi', level: 7 },
          { type: 'paragraph', text: 1 },
          { type: 'divider', text: 'Or' },
        ),
      ),
    ).toEqual([
      { code: 'invalid_props', path: ['fields', 0, 'text'] },
      { code: 'invalid_props', path: ['fields', 1, 'level'] },
      { code: 'invalid_props', path: ['fields', 2, 'text'] },
      { code: 'unknown_key', path: ['fields', 3, 'text'] },
    ])
  })
})
