import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import {
  createSchemaBuilder,
  defaultFieldTypes,
  type JsonField,
} from '@whatsaaaa/form-builder-schema'
import { file, form, messages, timeZones, useTimeZone } from '../helpers'

const { build, validate } = createSchemaBuilder()

const issues = (...fields: JsonField[]) =>
  validate(form(...fields)).issues.map(({ code, path }) => ({ code, path }))

const yesNo = [
  { value: true, label: 'Yes' },
  { value: false, label: 'No' },
]
const sizes = [
  { value: 1, label: 'Small' },
  { value: 2, label: 'Large' },
]
const colours = [
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' },
]

describe('value types', () => {
  it('registers every built-in type', () => {
    expect(Object.keys(defaultFieldTypes)).toEqual([
      'text',
      'textarea',
      'email',
      'password',
      'url',
      'tel',
      'number',
      'checkbox',
      'date',
      'time',
      'datetime',
      'select',
      'radio',
      'multiselect',
      'file',
      'heading',
      'paragraph',
      'divider',
      'group',
      'array',
    ])
  })

  describe('text-like types', () => {
    it.each(['text', 'textarea', 'password', 'tel'])('%s takes any string', (type) => {
      const schema = build(form({ name: 'a', type }))

      expect(v.parse(schema, { a: 'anything' })).toEqual({ a: 'anything' })
      expect(messages(schema, { a: 5 })).toHaveLength(1)
    })

    it.each([
      ['email', 'a@b.co', 'nope'],
      ['url', 'https://example.com', 'example'],
    ])('%s checks its format by default', (type, pass, fail) => {
      const schema = build(form({ name: 'a', type }))

      expect(messages(schema, { a: pass })).toEqual([])
      expect(messages(schema, { a: fail })).toHaveLength(1)
    })
  })

  it('number takes only real numbers', () => {
    const schema = build(form({ name: 'n', type: 'number' }))

    expect(messages(schema, { n: 5 })).toEqual([])
    expect(messages(schema, { n: '5' })).toHaveLength(1)
  })

  it('a required checkbox rejects false', () => {
    const schema = build(form({ name: 'terms', type: 'checkbox', required: true }))

    expect(messages(schema, { terms: false })).toEqual(['Required'])
    expect(messages(schema, { terms: true })).toEqual([])
  })

  describe('date and time', () => {
    it.each([
      ['date', '2026-10-28', '28.10.2026'],
      ['time', '14:30', '2pm'],
      ['datetime', '2026-10-28T14:30', '2026-10-28T14:30:00'],
    ])('%s takes an ISO string', (type, pass, fail) => {
      const schema = build(form({ name: 'd', type }))

      expect(v.parse(schema, { d: pass })).toEqual({ d: pass })
      expect(messages(schema, { d: fail })).toHaveLength(1)
    })

    it.each(timeZones)(
      "outputs the day at local midnight with output: 'date', after comparing ISO strings, in %s",
      (timeZone) => {
        useTimeZone(timeZone)
        const schema = build(
          form({
            name: 'd',
            type: 'date',
            output: 'date',
            rules: [{ rule: 'minValue', value: '2026-01-01', message: 'Too early' }],
          }),
        )
        const { d } = v.parse(schema, { d: '2026-03-01' }) as { d: Date }

        expect(d).toEqual(new Date(2026, 2, 1))
        expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 1, 0])
        expect(messages(schema, { d: '2025-12-31' })).toEqual(['Too early'])
      },
    )

    it.each(timeZones)(
      "outputs a datetime in local time with output: 'date', in %s",
      (timeZone) => {
        useTimeZone(timeZone)
        const schema = build(form({ name: 'd', type: 'datetime', output: 'date' }))

        expect(v.parse(schema, { d: '2026-03-01T10:30' })).toEqual({
          d: new Date(2026, 2, 1, 10, 30),
        })
      },
    )

    it('outputs a year before 100 as that year', () => {
      const schema = build(form({ name: 'd', type: 'date', output: 'date' }))
      const { d } = v.parse(schema, { d: '0050-01-15' }) as { d: Date }

      expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([50, 0, 15])
    })

    it('rejects an unknown output', () => {
      expect(issues({ name: 'd', type: 'datetime', output: 'unix' })).toEqual([
        { code: 'invalid_props', path: ['fields', 0, 'output'] },
      ])
    })
  })

  describe('select', () => {
    it('with number options rejects a string and accepts a number', () => {
      const schema = build(form({ name: 's', type: 'select', options: sizes }))

      expect(messages(schema, { s: '1' })).toHaveLength(1)
      expect(messages(schema, { s: 1 })).toEqual([])
      expect(messages(schema, { s: 3 })).toHaveLength(1)
    })

    it('with string options takes one of them', () => {
      const schema = build(form({ name: 's', type: 'select', options: colours, required: true }))

      expect(messages(schema, { s: 'red' })).toEqual([])
      expect(messages(schema, { s: 'green' })).toHaveLength(1)
      expect(messages(schema, { s: '' })).toEqual(['Required'])
    })

    it('without options takes any value of its valueType', () => {
      const numbers = build(form({ name: 's', type: 'select', valueType: 'number' }))
      const strings = build(form({ name: 's', type: 'select' }))

      expect(messages(numbers, { s: 42 })).toEqual([])
      expect(messages(numbers, { s: '42' })).toHaveLength(1)
      expect(messages(strings, { s: 'anything' })).toEqual([])
    })

    it('gets the kind of its options, so rules fit them', () => {
      expect(
        issues(
          { name: 'a', type: 'select', options: sizes, rules: [{ rule: 'minValue', value: 2 }] },
          { name: 'b', type: 'select', options: colours, rules: [{ rule: 'minValue', value: 2 }] },
        ),
      ).toEqual([{ code: 'kind_mismatch', path: ['fields', 1, 'rules', 0, 'rule'] }])
    })
  })

  describe('options', () => {
    it.each([
      ['empty options', []],
      [
        'duplicate values',
        [
          { value: 'a', label: 'A' },
          { value: 'a', label: 'Also A' },
        ],
      ],
      [
        'mixed value types',
        [
          { value: 'a', label: 'A' },
          { value: 1, label: 'One' },
        ],
      ],
    ])('reports %s as invalid_props', (_, options) => {
      expect(issues({ name: 's', type: 'select', options })).toEqual([
        { code: 'invalid_props', path: ['fields', 0, 'options'] },
      ])
    })

    it('reports boolean options on a select', () => {
      expect(issues({ name: 's', type: 'select', options: yesNo })).toMatchObject([
        { code: 'invalid_props' },
        { code: 'invalid_props' },
      ])
    })

    it('checks no rules while the options have issues', () => {
      const rules = [{ rule: 'maxValue', value: 3 }]

      expect(issues({ name: 'm', type: 'multiselect', options: [], rules })).toEqual([
        { code: 'invalid_props', path: ['fields', 0, 'options'] },
      ])
    })

    it('reports a radio or multiselect without options', () => {
      expect(issues({ name: 'r', type: 'radio' }, { name: 'm', type: 'multiselect' })).toEqual([
        { code: 'invalid_props', path: ['fields', 0, 'options'] },
        { code: 'invalid_props', path: ['fields', 1, 'options'] },
      ])
    })
  })

  describe('radio', () => {
    it('takes one of its options', () => {
      const schema = build(form({ name: 'r', type: 'radio', options: colours }))

      expect(messages(schema, { r: 'blue' })).toEqual([])
      expect(messages(schema, { r: 'green' })).toHaveLength(1)
    })

    it('accepts "no" when required', () => {
      const schema = build(form({ name: 'r', type: 'radio', options: yesNo, required: true }))

      expect(v.parse(schema, { r: false })).toEqual({ r: false })
      expect(messages(schema, { r: undefined })).toEqual(['Required'])
    })
  })

  describe('multiselect', () => {
    it('takes a list of its options', () => {
      const schema = build(form({ name: 'm', type: 'multiselect', options: sizes }))

      expect(v.parse(schema, { m: [1, 2] })).toEqual({ m: [1, 2] })
      expect(messages(schema, { m: [1, 3] })).toHaveLength(1)
      expect(v.parse(schema, { m: [] })).toEqual({ m: undefined })
    })

    it('rejects [] when required, and counts with minLength', () => {
      const schema = build(
        form({
          name: 'm',
          type: 'multiselect',
          options: colours,
          required: true,
          rules: [{ rule: 'minLength', value: 2, message: 'Pick at least two' }],
        }),
      )

      expect(messages(schema, { m: [] })).toEqual(['Required'])
      expect(messages(schema, { m: ['red'] })).toEqual(['Pick at least two'])
      expect(messages(schema, { m: ['red', 'blue'] })).toEqual([])
    })

    it('runs rules for the option kind on each item', () => {
      const schema = build(
        form({
          name: 'm',
          type: 'multiselect',
          options: sizes,
          rules: [{ rule: 'maxValue', value: 1, message: 'Small only' }],
        }),
      )

      expect(messages(schema, { m: [1, 2] })).toEqual(['Small only'])
    })
  })

  describe('file', () => {
    it('takes one File', () => {
      const schema = build(form({ name: 'f', type: 'file', required: true }))

      expect(messages(schema, { f: file(10) })).toEqual([])
      expect(messages(schema, { f: undefined })).toEqual(['Required'])
      expect(messages(schema, { f: 'a.png' })).toHaveLength(1)
    })

    it('with multiple checks each file with maxSize and the count with maxLength', () => {
      const schema = build(
        form({
          name: 'f',
          type: 'file',
          multiple: true,
          required: true,
          rules: [
            { rule: 'maxSize', value: 100, message: 'Too big' },
            { rule: 'maxLength', value: 3, message: 'Three at most' },
          ],
        }),
      )

      expect(messages(schema, { f: [file(10), file(20)] })).toEqual([])
      expect(messages(schema, { f: [file(10), file(200)] })).toEqual(['Too big'])
      expect(messages(schema, { f: [file(1), file(1), file(1), file(1)] })).toEqual([
        'Three at most',
      ])
      expect(messages(schema, { f: [] })).toEqual(['Required'])
    })

    it('rejects files whose MIME type is not in accept', () => {
      const one = build(form({ name: 'f', type: 'file', accept: 'image/png, image/jpeg' }))
      const many = build(form({ name: 'f', type: 'file', accept: 'image/png', multiple: true }))

      expect(messages(one, { f: file(1, 'image/jpeg') })).toEqual([])
      expect(messages(one, { f: file(1, 'application/pdf') })).toHaveLength(1)
      expect(messages(many, { f: [file(1, 'image/png'), file(1, 'text/plain')] })).toHaveLength(1)
      expect(
        v
          .safeParse(many, { f: [file(1, 'text/plain')] })
          .issues?.map((issue) => v.getDotPath(issue)),
      ).toEqual(['f'])
      // Something that is no File fails once, not once more for its MIME type.
      expect(messages(many, { f: ['a.png'] })).toHaveLength(1)
    })

    it.each(['.pdf', 'image/*', 'image/png,'])('reports accept %j as invalid_props', (accept) => {
      expect(issues({ name: 'f', type: 'file', accept })).toEqual([
        { code: 'invalid_props', path: ['fields', 0, 'accept'] },
      ])
    })

    it('rejects rules for arrays without multiple', () => {
      expect(issues({ name: 'f', type: 'file', rules: [{ rule: 'maxLength', value: 3 }] })).toEqual(
        [{ code: 'kind_mismatch', path: ['fields', 0, 'rules', 0, 'rule'] }],
      )
    })
  })
})
