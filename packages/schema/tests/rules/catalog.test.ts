import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { createSchemaBuilder, defaultRules, type JsonRule } from '@whatsaaaa/form-builder-schema'
import { form, messages } from '../helpers'

// One test type per kind the built-in types don't cover yet.
const { build, validate } = createSchemaBuilder({
  fieldTypes: {
    day: { kind: 'date', schema: () => v.string() },
    tags: { kind: 'array', schema: () => v.array(v.union([v.string(), v.number()])) },
    flag: { kind: 'boolean', schema: () => v.boolean() },
    // Size and MIME type rules only read `size` and `type`, so a plain object stands in for a File.
    upload: { kind: 'file', schema: () => v.looseObject({ size: v.number(), type: v.string() }) },
  },
})

const file = (size: number, type = '') => ({ size, type })

interface Case {
  rule: string
  /** The field type to test on. */
  type: string
  params?: Record<string, unknown>
  /** Params that are an `invalid_params` issue. Rules without params get an unknown one instead. */
  bad?: Record<string, unknown>
  /** A field type whose kind the rule doesn't support. Defaults to `flag` (boolean). */
  mismatch?: string
}

interface ValidationCase extends Case {
  pass: unknown
  fail: unknown
}

interface NormalizeCase extends Case {
  input: unknown
  output: unknown
}

const validation: ValidationCase[] = [
  // lengthRules
  {
    rule: 'length',
    type: 'text',
    params: { value: 3 },
    pass: 'abc',
    fail: 'ab',
    bad: { value: -1 },
  },
  {
    rule: 'minLength',
    type: 'text',
    params: { value: 2 },
    pass: 'ab',
    fail: 'a',
    bad: { value: 1.5 },
  },
  {
    rule: 'maxLength',
    type: 'text',
    params: { value: 2 },
    pass: 'ab',
    fail: 'abc',
    bad: { value: '2' },
  },
  { rule: 'notLength', type: 'text', params: { value: 2 }, pass: 'abc', fail: 'ab', bad: {} },
  // textUnitRules: '👍' is one grapheme, two UTF-16 units and four bytes. 'é' is two bytes.
  {
    rule: 'graphemes',
    type: 'text',
    params: { value: 1 },
    pass: '👍',
    fail: 'ab',
    bad: { value: -1 },
  },
  { rule: 'minGraphemes', type: 'text', params: { value: 2 }, pass: '👍👍', fail: '👍', bad: {} },
  { rule: 'maxGraphemes', type: 'text', params: { value: 1 }, pass: '👍', fail: '👍👍', bad: {} },
  { rule: 'notGraphemes', type: 'text', params: { value: 1 }, pass: 'ab', fail: '👍', bad: {} },
  {
    rule: 'words',
    type: 'text',
    params: { locale: 'en', value: 2 },
    pass: 'hello world',
    fail: 'hello',
    bad: { locale: 'not a locale!', value: 2 },
  },
  {
    rule: 'minWords',
    type: 'text',
    params: { value: 2 },
    pass: 'a b',
    fail: 'a',
    bad: { value: -1 },
  },
  {
    rule: 'maxWords',
    type: 'text',
    params: { locale: 'en', value: 1 },
    pass: 'a',
    fail: 'a b',
    bad: {},
  },
  { rule: 'notWords', type: 'text', params: { value: 1 }, pass: 'a b', fail: 'a', bad: {} },
  { rule: 'bytes', type: 'text', params: { value: 2 }, pass: 'é', fail: 'e', bad: { value: -1 } },
  { rule: 'minBytes', type: 'text', params: { value: 2 }, pass: 'é', fail: 'e', bad: {} },
  { rule: 'maxBytes', type: 'text', params: { value: 1 }, pass: 'e', fail: 'é', bad: {} },
  { rule: 'notBytes', type: 'text', params: { value: 1 }, pass: 'é', fail: 'e', bad: {} },
  // contentRules
  {
    rule: 'regex',
    type: 'text',
    params: { pattern: '^[a-z]+$' },
    pass: 'abc',
    fail: 'ABC',
    bad: { pattern: '(' },
  },
  {
    rule: 'startsWith',
    type: 'text',
    params: { value: 'ab' },
    pass: 'abc',
    fail: 'cab',
    bad: { value: 1 },
  },
  { rule: 'endsWith', type: 'text', params: { value: 'bc' }, pass: 'abc', fail: 'bca', bad: {} },
  {
    rule: 'includes',
    type: 'text',
    params: { value: 'b' },
    pass: 'abc',
    fail: 'xyz',
    bad: { value: 1 },
  },
  { rule: 'excludes', type: 'text', params: { value: 'b' }, pass: 'xyz', fail: 'abc', bad: {} },
  // formatRules
  { rule: 'email', type: 'text', pass: 'a@b.co', fail: 'nope' },
  { rule: 'rfcEmail', type: 'text', pass: 'a@b.co', fail: 'nope' },
  { rule: 'url', type: 'text', pass: 'https://example.com', fail: 'nope' },
  { rule: 'domain', type: 'text', pass: 'example.com', fail: 'nope' },
  { rule: 'slug', type: 'text', pass: 'my-post', fail: 'My Post' },
  { rule: 'uuid', type: 'text', pass: '123e4567-e89b-12d3-a456-426614174000', fail: 'nope' },
  { rule: 'ulid', type: 'text', pass: '01ARZ3NDEKTSV4RRFFQ69G5FAV', fail: 'nope' },
  { rule: 'cuid2', type: 'text', pass: 'tz4a98xxat96iws9zmbrgj3a', fail: 'Nope!' },
  { rule: 'nanoid', type: 'text', pass: 'V1StGXR8_Z5jdHi6B-myT', fail: 'no pe' },
  { rule: 'ip', type: 'text', pass: '127.0.0.1', fail: 'nope' },
  { rule: 'ipv4', type: 'text', pass: '127.0.0.1', fail: '::1' },
  { rule: 'ipv6', type: 'text', pass: '::1', fail: '127.0.0.1' },
  { rule: 'mac', type: 'text', pass: '00:1A:2B:3C:4D:5E', fail: 'nope' },
  { rule: 'mac48', type: 'text', pass: '00:1A:2B:3C:4D:5E', fail: '00:1A:2B:3C:4D:5E:6F:70' },
  { rule: 'mac64', type: 'text', pass: '00:1A:2B:3C:4D:5E:6F:70', fail: '00:1A:2B:3C:4D:5E' },
  { rule: 'hexColor', type: 'text', pass: '#ff0000', fail: 'red' },
  { rule: 'hexadecimal', type: 'text', pass: 'ff', fail: 'zz' },
  { rule: 'octal', type: 'text', pass: '17', fail: '19' },
  { rule: 'decimal', type: 'text', pass: '1.5', fail: '1,5' },
  { rule: 'digits', type: 'text', pass: '123', fail: '12a' },
  { rule: 'base64', type: 'text', pass: 'aGk=', fail: 'not base64!' },
  { rule: 'bic', type: 'text', pass: 'DEUTDEFF', fail: 'nope' },
  { rule: 'creditCard', type: 'text', pass: '4242424242424242', fail: '1234' },
  { rule: 'imei', type: 'text', pass: '490154203237518', fail: '123' },
  { rule: 'isbn', type: 'text', pass: '978-0-306-40615-7', fail: '123' },
  { rule: 'isrc', type: 'text', pass: 'USRC17607839', fail: 'nope' },
  { rule: 'emoji', type: 'text', pass: '😀', fail: 'a' },
  {
    rule: 'hash',
    type: 'text',
    params: { types: ['md5'] },
    pass: 'd41d8cd98f00b204e9800998ecf8427e',
    fail: 'nope',
    bad: { types: [] },
  },
  // dateRules
  { rule: 'isoDate', type: 'day', pass: '2026-10-28', fail: '28.10.2026' },
  { rule: 'isoDateTime', type: 'day', pass: '2026-10-28T14:30', fail: '2026-10-28' },
  { rule: 'isoTime', type: 'day', pass: '14:30', fail: '25:00' },
  { rule: 'isoTimeSecond', type: 'day', pass: '14:30:15', fail: '14:30' },
  { rule: 'isoTimestamp', type: 'day', pass: '2026-10-28T14:30:15.000Z', fail: '2026-10-28' },
  { rule: 'isoWeek', type: 'day', pass: '2026-W44', fail: '2026-44' },
  // comparisonRules
  { rule: 'minValue', type: 'number', params: { value: 3 }, pass: 3, fail: 2, bad: { value: '3' } },
  { rule: 'maxValue', type: 'number', params: { value: 3 }, pass: 3, fail: 4, bad: {} },
  { rule: 'gtValue', type: 'number', params: { value: 3 }, pass: 4, fail: 3, bad: {} },
  { rule: 'ltValue', type: 'number', params: { value: 3 }, pass: 2, fail: 3, bad: {} },
  {
    rule: 'value',
    type: 'number',
    params: { value: 3 },
    pass: 3,
    fail: 4,
    bad: {},
    mismatch: 'upload',
  },
  {
    rule: 'notValue',
    type: 'number',
    params: { value: 3 },
    pass: 4,
    fail: 3,
    bad: {},
    mismatch: 'upload',
  },
  {
    rule: 'values',
    type: 'number',
    params: { values: [1, 2] },
    pass: 2,
    fail: 3,
    bad: { values: [] },
  },
  {
    rule: 'notValues',
    type: 'number',
    params: { values: [1, 2] },
    pass: 3,
    fail: 2,
    bad: { values: ['1'] },
  },
  // numberRules
  { rule: 'integer', type: 'number', pass: 1, fail: 1.5 },
  { rule: 'safeInteger', type: 'number', pass: 1, fail: 2 ** 53 },
  { rule: 'finite', type: 'number', pass: 1, fail: Infinity },
  {
    rule: 'multipleOf',
    type: 'number',
    params: { value: 5 },
    pass: 10,
    fail: 11,
    bad: { value: 0 },
  },
  // fileRules
  {
    rule: 'minSize',
    type: 'upload',
    params: { value: 2 },
    pass: file(2),
    fail: file(1),
    bad: { value: -1 },
  },
  { rule: 'maxSize', type: 'upload', params: { value: 2 }, pass: file(2), fail: file(3), bad: {} },
  { rule: 'size', type: 'upload', params: { value: 2 }, pass: file(2), fail: file(3), bad: {} },
  { rule: 'notSize', type: 'upload', params: { value: 2 }, pass: file(3), fail: file(2), bad: {} },
  {
    rule: 'mimeType',
    type: 'upload',
    params: { types: ['image/png'] },
    pass: file(1, 'image/png'),
    fail: file(1, 'text/plain'),
    bad: { types: ['image/*'] },
  },
]

const normalize: NormalizeCase[] = [
  { rule: 'trim', type: 'text', input: '  a  ', output: 'a' },
  { rule: 'trimStart', type: 'text', input: '  a  ', output: 'a  ' },
  { rule: 'trimEnd', type: 'text', input: '  a  ', output: '  a' },
  { rule: 'toLowerCase', type: 'text', input: 'AbC', output: 'abc' },
  { rule: 'toUpperCase', type: 'text', input: 'AbC', output: 'ABC' },
  {
    rule: 'normalize',
    type: 'text',
    params: { form: 'NFKC' },
    input: 'ﬁ', // the fi ligature, one character
    output: 'fi',
    bad: { form: 'NFX' },
  },
  {
    rule: 'toMinValue',
    type: 'number',
    params: { value: 3 },
    input: 1,
    output: 3,
    bad: { value: '3' },
  },
  { rule: 'toMaxValue', type: 'number', params: { value: 3 }, input: 5, output: 3, bad: {} },
]

const field = (type: string, rule: JsonRule) => form({ name: 'x', type, rules: [rule] })
const codes = (json: unknown) => validate(json).issues.map((issue) => issue.code)

describe('the rule catalog', () => {
  it('has a test case for every built-in rule', () => {
    const tested = [...validation, ...normalize].map((test) => test.rule)

    expect(tested.sort()).toEqual(Object.keys(defaultRules).sort())
  })

  it.each(Object.entries(defaultRules))('%s has a label and a category', (_, def) => {
    expect(def.meta?.label).toEqual(expect.any(String))
    expect(def.meta?.category).toEqual(expect.any(String))
  })

  describe.each(validation)('$rule', (test) => {
    const rule = { rule: test.rule, ...test.params }

    it('passes and fails', () => {
      const schema = build(field(test.type, rule))

      expect(messages(schema, { x: test.pass })).toEqual([])
      expect(messages(schema, { x: test.fail })).toHaveLength(1)
    })

    it('rejects bad params', () => {
      expect(codes(field(test.type, { rule: test.rule, ...(test.bad ?? { nope: 1 }) }))).toEqual([
        test.bad ? 'invalid_params' : 'unknown_param',
      ])
    })

    it('rejects a kind it does not support', () => {
      expect(codes(field(test.mismatch ?? 'flag', rule))).toEqual(['kind_mismatch'])
    })
  })

  describe.each(normalize)('$rule', (test) => {
    const rule = { rule: test.rule, ...test.params }

    it('changes the value', () => {
      expect(v.parse(build(field(test.type, rule)), { x: test.input })).toEqual({ x: test.output })
    })

    it('rejects bad params', () => {
      expect(codes(field(test.type, { rule: test.rule, ...(test.bad ?? { nope: 1 }) }))).toEqual([
        test.bad ? 'invalid_params' : 'unknown_param',
      ])
    })

    it('rejects a kind it does not support', () => {
      expect(codes(field(test.mismatch ?? 'flag', rule))).toEqual(['kind_mismatch'])
    })
  })
})
