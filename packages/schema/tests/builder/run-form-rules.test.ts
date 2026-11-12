import * as v from 'valibot'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  createSchemaBuilder,
  defineFormRule,
  type JsonField,
  type JsonForm,
  type JsonFormRule,
  type BuiltSchema,
} from '@whatsaaaa/form-builder-schema'
import { timeZones, useTimeZone } from '../helpers'

const { build } = createSchemaBuilder()

const formWith = (fields: JsonField[], ...formRules: JsonFormRule[]): JsonForm => ({
  version: '1',
  fields,
  formRules,
})

/** Each issue's message and its path, as Formisch reads it. */
const issuesOf = (schema: v.GenericSchema, input: unknown) =>
  v.safeParse(schema, input).issues?.map((issue) => ({
    path: issue.path?.map((item) => item.key) ?? [],
    message: issue.message,
  })) ?? []

const passwords = build(
  formWith(
    [
      {
        name: 'password',
        type: 'password',
        required: true,
        rules: [{ rule: 'minLength', value: 8 }],
      },
      { name: 'password2', type: 'password', required: true },
    ],
    { rule: 'sameAs', field: 'password2', other: 'password', message: 'Passwords differ' },
  ),
)

describe('running form rules', () => {
  it('puts the issue on its field only', () => {
    expect(issuesOf(passwords, { password: 'secret123', password2: 'secret124' })).toEqual([
      { path: ['password2'], message: 'Passwords differ' },
    ])
    expect(v.parse(passwords, { password: 'secret123', password2: 'secret123' })).toEqual({
      password: 'secret123',
      password2: 'secret123',
    })
  })

  it('runs only when the fields it reads are valid', () => {
    expect(issuesOf(passwords, { password: 'short', password2: 'other' })).toEqual([
      { path: ['password'], message: 'Invalid length: Expected >=8 but received 5' },
    ])
    expect(issuesOf(passwords, { password: 'secret123', password2: '' })).toEqual([
      { path: ['password2'], message: 'Required' },
    ])
  })

  it('gives the same issues in any order, as each sees only the issues of the fields', () => {
    const fields: JsonField[] = [
      { name: 'a', type: 'text' },
      { name: 'b', type: 'text' },
      { name: 'c', type: 'text' },
    ]
    const rules: JsonFormRule[] = [
      { rule: 'sameAs', field: 'b', other: 'a', message: 'b must equal a' },
      { rule: 'differentFrom', field: 'c', other: 'b', message: 'c must differ from b' },
      { rule: 'differentFrom', field: 'a', other: 'c', message: 'a must differ from c' },
    ]
    const orders = [
      [0, 1, 2],
      [0, 2, 1],
      [1, 0, 2],
      [1, 2, 0],
      [2, 0, 1],
      [2, 1, 0],
    ]
    const byPath = (issues: { path: unknown[]; message: string }[]) =>
      issues.map(({ path, message }) => `${path.join('.')}: ${message}`).sort()

    for (const input of [
      { a: 'x', b: 'y', c: 'y' },
      { a: 'x', b: 'x', c: 'x' },
    ]) {
      const results = orders.map((order) =>
        byPath(issuesOf(build(formWith(fields, ...order.map((i) => rules[i]!))), input)),
      )
      expect(new Set(results.map((result) => JSON.stringify(result))).size).toBe(1)
    }
    expect(byPath(issuesOf(build(formWith(fields, ...rules)), { a: 'x', b: 'y', c: 'y' }))).toEqual(
      ['b: b must equal a', 'c: c must differ from b'],
    )
    expect(byPath(issuesOf(build(formWith(fields, ...rules)), { a: 'x', b: 'x', c: 'x' }))).toEqual(
      ['a: a must differ from c', 'c: c must differ from b'],
    )
  })

  it('never runs on a value that is no object', () => {
    expect(issuesOf(passwords, null)).toEqual([{ path: [], message: expect.any(String) }])
  })

  it('never runs on an empty value', () => {
    const schema = build(
      formWith(
        [
          { name: 'start', type: 'date' },
          { name: 'end', type: 'date' },
        ],
        { rule: 'compare', field: 'end', op: 'gt', other: 'start', message: 'After the start' },
      ),
    )

    expect(issuesOf(schema, { start: '2026-03-01', end: '' })).toEqual([])
    expect(issuesOf(schema, { start: '', end: '2026-03-01' })).toEqual([])
  })

  it.each([
    ['2026-03-02', []],
    ['2026-03-01', [{ path: ['end'], message: 'After the start' }]],
    ['2026-02-28', [{ path: ['end'], message: 'After the start' }]],
  ])('compares ISO dates: end %s', (end, issues) => {
    const schema = build(
      formWith(
        [
          { name: 'start', type: 'date', required: true },
          { name: 'end', type: 'date', required: true },
        ],
        { rule: 'compare', field: 'end', op: 'gt', other: 'start', message: 'After the start' },
      ),
    )

    expect(issuesOf(schema, { start: '2026-03-01', end })).toEqual(issues)
  })

  it('compares dates with output: date', () => {
    const schema = build(
      formWith(
        [
          { name: 'start', type: 'date', output: 'date' },
          { name: 'end', type: 'date', output: 'date' },
        ],
        { rule: 'sameAs', field: 'end', other: 'start', message: 'Same day' },
      ),
    )

    expect(issuesOf(schema, { start: '2026-03-01', end: '2026-03-01' })).toEqual([])
    expect(issuesOf(schema, { start: '2026-03-01', end: '2026-03-02' })).toEqual([
      { path: ['end'], message: 'Same day' },
    ])
  })

  it.each(timeZones)(
    'compares a date with output: date with one without it by their day, in %s',
    (timeZone) => {
      useTimeZone(timeZone)
      const dates: JsonField[] = [
        { name: 'start', type: 'date', output: 'date' },
        { name: 'end', type: 'date' },
      ]
      const after = build(
        formWith(dates, {
          rule: 'compare',
          op: 'gt',
          field: 'end',
          other: 'start',
          message: 'End after start',
        }),
      )
      const same = build(
        formWith(dates, { rule: 'sameAs', field: 'end', other: 'start', message: 'Same day' }),
      )

      expect(issuesOf(after, { start: '2026-03-01', end: '2026-03-02' })).toEqual([])
      expect(issuesOf(after, { start: '2026-03-01', end: '2026-03-01' })).toEqual([
        { path: ['end'], message: 'End after start' },
      ])
      expect(issuesOf(same, { start: '2026-03-01', end: '2026-03-01' })).toEqual([])
      expect(issuesOf(same, { start: '2026-03-01', end: '2026-03-02' })).toEqual([
        { path: ['end'], message: 'Same day' },
      ])
    },
  )

  it('runs your own rule on a nested path', () => {
    const sameCountry = defineFormRule({
      params: v.object({ others: v.array(v.string()) }),
      reads: (params) => params.others,
      check: (values) => new Set(values).size === 1,
    })
    const { build } = createSchemaBuilder({ formRules: { sameCountry } })
    const country: JsonField = { name: 'country', type: 'text' }
    const schema = build(
      formWith(
        [
          { name: 'shipping', type: 'group', fields: [country] },
          { name: 'billing', type: 'group', fields: [country] },
        ],
        {
          rule: 'sameCountry',
          field: 'billing.country',
          others: ['shipping.country'],
          message: 'We ship to your billing country only',
        },
      ),
    )

    const input = (a: string, b: string) => ({ shipping: { country: a }, billing: { country: b } })
    expect(issuesOf(schema, input('RS', 'RS'))).toEqual([])
    expect(issuesOf(schema, input('RS', 'ME'))).toEqual([
      { path: ['billing', 'country'], message: 'We ship to your billing country only' },
    ])
  })

  describe('in the items of a list', () => {
    const lines: JsonField = {
      name: 'lines',
      type: 'array',
      fields: [
        { name: 'qty', type: 'number', required: true },
        { name: 'stock', type: 'number', required: true },
      ],
    }
    const atMost = (other: string): JsonFormRule => ({
      rule: 'compare',
      field: 'lines.*.qty',
      op: 'lte',
      other,
      message: 'Not enough in stock',
    })
    const line = (qty: number, stock: number) => ({ qty, stock })

    it('runs once per item and reports on its index', () => {
      const schema = build(formWith([lines], atMost('lines.*.stock')))

      expect(issuesOf(schema, { lines: [line(5, 3), line(1, 3), line(9, 3), line(3, 3)] })).toEqual(
        [
          { path: ['lines', 0, 'qty'], message: 'Not enough in stock' },
          { path: ['lines', 2, 'qty'], message: 'Not enough in stock' },
        ],
      )
      expect(issuesOf(schema, { lines: [] })).toEqual([])
    })

    it('never runs on a list that is no array', () => {
      const schema = build(formWith([lines], atMost('lines.*.stock')))

      expect(issuesOf(schema, null)).toEqual([{ path: [], message: expect.any(String) }])
      expect(issuesOf(schema, { lines: 'x' })).toEqual([
        { path: ['lines'], message: expect.any(String) },
      ])
    })

    it('skips an item whose fields have issues', () => {
      const schema = build(formWith([lines], atMost('lines.*.stock')))

      expect(issuesOf(schema, { lines: [line(5, 3), { qty: 9, stock: '' }] })).toEqual([
        { path: ['lines', 1, 'stock'], message: 'Required' },
        { path: ['lines', 0, 'qty'], message: 'Not enough in stock' },
      ])
    })

    it('reads a field outside the list for every item', () => {
      const schema = build(formWith([lines, { name: 'max', type: 'number' }], atMost('max')))

      expect(issuesOf(schema, { lines: [line(2, 0), line(7, 0)], max: 5 })).toEqual([
        { path: ['lines', 1, 'qty'], message: 'Not enough in stock' },
      ])
    })

    it('runs in lists inside lists', () => {
      const schema = build(
        formWith([{ name: 'orders', type: 'array', fields: [lines] }], {
          ...atMost('orders.*.lines.*.stock'),
          field: 'orders.*.lines.*.qty',
        }),
      )

      const orders = [{ lines: [line(1, 1)] }, { lines: [line(1, 1), line(2, 1)] }]
      expect(issuesOf(schema, { orders })).toEqual([
        { path: ['orders', 1, 'lines', 1, 'qty'], message: 'Not enough in stock' },
      ])
    })

    it('runs on the items of a list of single values', () => {
      const schema = build(
        formWith(
          [
            { name: 'tags', type: 'array', of: { type: 'text' } },
            { name: 'banned', type: 'text' },
          ],
          { rule: 'differentFrom', field: 'tags.*', other: 'banned', message: 'Not allowed' },
        ),
      )

      expect(issuesOf(schema, { tags: ['a', 'b', 'a'], banned: 'a' })).toEqual([
        { path: ['tags', 0], message: 'Not allowed' },
        { path: ['tags', 2], message: 'Not allowed' },
      ])
    })
  })

  it('resolves its message like every other message', () => {
    const { build } = createSchemaBuilder({
      resolveMessage: (key, ctx) => `${key}|${ctx.rule}|${ctx.field.name}|${ctx.path.join('.')}`,
    })
    const schema = build(
      formWith(
        [
          { name: 'a', type: 'text' },
          { name: 'b', type: 'text' },
        ],
        { rule: 'sameAs', field: 'b', other: 'a', message: 'errors.differ' },
      ),
    )

    expect(issuesOf(schema, { a: 'x', b: 'y' })).toEqual([
      { path: ['b'], message: 'errors.differ|sameAs|b|formRules.0' },
    ])
  })

  it('keeps the object schema that Formisch reads', () => {
    expect(passwords.type).toBe('object')
    expect(Object.keys(passwords.entries)).toEqual(['password', 'password2'])
  })

  it('puts the form rules in a pipe after the object schema', () => {
    expectTypeOf(passwords).toEqualTypeOf<BuiltSchema>()
    const { pipe } = passwords as Extract<BuiltSchema, { pipe: unknown }>

    expect(pipe.map((item) => item.type)).toEqual(['object', 'raw_check'])
    // A new object from the entries leaves the form rules out, unless it takes the pipe's checks.
    const [, ...checks] = pipe
    const withoutRules = v.object({ ...passwords.entries })
    const withRules = v.pipe(v.object({ ...passwords.entries }), ...checks)
    const input = { password: 'longenough', password2: 'different' }

    expect(issuesOf(withoutRules, input)).toEqual([])
    expect(issuesOf(withRules, input)).toEqual([
      { path: ['password2'], message: 'Passwords differ' },
    ])
  })

  it('gives the object schema alone without form rules', () => {
    const schema = build(formWith([{ name: 'a', type: 'text' }]))

    expect(schema.type).toBe('object')
    expect('pipe' in schema).toBe(false)
  })
})
