import { describe, expect, it } from 'vitest'
import { createSchemaBuilder, DefinitionError } from '@whatsaaaa/form-builder-schema'
import { form } from '../helpers'

const { build, validate } = createSchemaBuilder({
  fieldTypes: { heading: { kind: 'none' } },
})

const codesAndPaths = (json: unknown) =>
  validate(json).issues.map(({ code, path }) => ({ code, path }))

describe('validate', () => {
  it('accepts a valid definition', () => {
    expect(validate(form({ name: 'a', type: 'text' }))).toEqual({ success: true, issues: [] })
  })

  it.each([null, 'x', { version: '1', fields: null }, { version: '1' }])(
    'reports %j as invalid_shape without throwing',
    (json) => {
      const { issues } = validate(json)

      expect(issues).toHaveLength(1)
      expect(issues[0]?.code).toBe('invalid_shape')
    },
  )

  it('reports an unsupported version', () => {
    expect(codesAndPaths({ version: '2', fields: [] })).toEqual([
      { code: 'unsupported_version', path: ['version'] },
    ])
  })

  it('reports every issue in document order', () => {
    const json = form(
      { name: 'a', type: 'nope' },
      { name: 'b', type: 'text', rules: [{ rule: 'nope' }] },
      { name: 'c', type: 'text', rules: [{ rule: 'email', foo: 1 }] },
      { name: 'a', type: 'text' },
    )

    expect(codesAndPaths(json)).toEqual([
      { code: 'unknown_type', path: ['fields', 0, 'type'] },
      { code: 'unknown_rule', path: ['fields', 1, 'rules', 0, 'rule'] },
      { code: 'unknown_param', path: ['fields', 2, 'rules', 0, 'foo'] },
      { code: 'duplicate_name', path: ['fields', 3, 'name'] },
    ])

    const error = (() => {
      try {
        build(json)
      } catch (caught) {
        return caught
      }
    })()
    expect(error).toBeInstanceOf(DefinitionError)
    expect((error as DefinitionError).issues).toEqual(validate(json).issues)
    expect((error as DefinitionError).message).toContain('fields[2].rules[0].foo')
  })

  it('reports unknown keys, but never under ui', () => {
    expect(codesAndPaths(form({ name: 'a', type: 'text', requird: true }))).toEqual([
      { code: 'unknown_key', path: ['fields', 0, 'requird'] },
    ])
    expect(validate(form({ name: 'a', type: 'text', ui: { requird: true } })).success).toBe(true)
  })

  it('reports a missing name on value fields only', () => {
    expect(codesAndPaths(form({ type: 'text' }, { type: 'heading' }))).toEqual([
      { code: 'missing_name', path: ['fields', 0, 'name'] },
    ])
  })

  it('reports rules and params that do not fit', () => {
    const json = form(
      { name: 'a', type: 'text', rules: [{ rule: 'integer' }] },
      { name: 'b', type: 'text', rules: [{ rule: 'minLength', value: -1 }] },
    )

    expect(codesAndPaths(json)).toEqual([
      { code: 'kind_mismatch', path: ['fields', 0, 'rules', 0, 'rule'] },
      { code: 'invalid_params', path: ['fields', 1, 'rules', 0, 'value'] },
    ])
  })

  it('rejects rules and required on fields without a value', () => {
    const json = form({ type: 'heading', required: true, rules: [{ rule: 'trim' }] })

    expect(codesAndPaths(json)).toEqual([
      { code: 'invalid_shape', path: ['fields', 0, 'required'] },
      { code: 'invalid_shape', path: ['fields', 0, 'rules'] },
    ])
  })
})
