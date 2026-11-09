import { createSchemaBuilder, type JsonField, type JsonForm } from '@whatsaaaa/form-builder-schema'
import { describe, expect, it } from 'vitest'
import { definitionIssues, fixtures, form } from './helpers'

const fields: JsonField[] = [
  { name: 'name', type: 'text' },
  { name: 'age', type: 'number', rules: [{ rule: 'minValue', value: 18 }] },
  { name: 'agree', type: 'checkbox', required: true },
  { name: 'born', type: 'date' },
  {
    name: 'size',
    type: 'select',
    options: [
      { value: 's', label: 'S' },
      { value: 'm', label: 'M' },
    ],
  },
  {
    name: 'topics',
    type: 'multiselect',
    options: [
      { value: 1, label: 'One' },
      { value: 2, label: 'Two' },
    ],
  },
  { name: 'tags', type: 'array', of: { type: 'text', rules: [{ rule: 'maxLength', value: 3 }] } },
  { name: 'lines', type: 'array', fields: [{ name: 'kind', type: 'text' }] },
  { name: 'photo', type: 'file' },
  { name: 'photos', type: 'file', multiple: true },
  { name: 'address', type: 'group', fields: [{ name: 'city', type: 'text' }] },
  { type: 'heading', name: 'title', text: 'Title' },
]

/** The issues of a field with `affects` after the fields above. */
const issuesOf = (affects: unknown) =>
  definitionIssues(form(...fields, { name: 'x', type: 'text', affects } as JsonField)).map(
    (issue) => issue.replace('fields.12.affects', 'affects'),
  )

const when = (condition: unknown) => [{ effect: 'show', when: condition }]

describe('the fixtures', () => {
  it.each(Object.entries(fixtures))('%s has no issues', (_, json) => {
    expect(definitionIssues(json)).toEqual([])
  })

  it('are unknown keys for a builder without affects', () => {
    expect(createSchemaBuilder().validate(fixtures.business).issues).toEqual([
      expect.objectContaining({ code: 'unknown_key', path: ['fields', 2, 'affects'] }),
      expect.objectContaining({ code: 'unknown_key', path: ['fields', 3, 'affects'] }),
    ])
  })
})

describe('the shape of affects', () => {
  it('is a list of objects, each with an effect and a condition', () => {
    expect(issuesOf({})).toEqual([
      'invalid_shape at affects: "affects" is a list of { "effect", "when" }',
    ])
    expect(issuesOf(['show'])).toEqual([
      'invalid_shape at affects.0: An affect is an object with "effect" and "when"',
    ])
    expect(issuesOf([{ effect: 'reveal', when: { field: 'name', notEmpty: true } }])).toEqual([
      'invalid_shape at affects.0.effect: "effect" is "show", "hide" or "hideAndClear"',
    ])
    expect(issuesOf([{ effect: 'show' }])).toEqual([
      'invalid_shape at affects.0: An affect needs "when", its condition',
    ])
    expect(issuesOf([{ effect: 'show', when: { field: 'name', empty: true }, if: 1 }])).toEqual([
      'unknown_key at affects.0.if: Unknown key "if" on an affect',
    ])
  })

  it('has each effect once', () => {
    const condition = { field: 'name', empty: true }
    expect(
      issuesOf([
        { effect: 'hide', when: condition },
        { effect: 'show', when: condition },
        { effect: 'hide', when: condition },
      ]),
    ).toEqual([
      'invalid_shape at affects.2: "hide" is in "affects" already. Join its conditions with "all" or "any"',
    ])
  })

  it('is no key of the field of a list of single values', () => {
    const json = form({
      name: 'tags',
      type: 'array',
      of: { type: 'text', affects: when({ field: 'tags', notEmpty: true }) },
    } as JsonField)
    expect(definitionIssues(json)).toEqual([
      `invalid_shape at fields.0.of.affects: The field of a list's items has no "affects" of its own. Put them on the list`,
    ])
  })

  it('may be empty', () => {
    expect(issuesOf([])).toEqual([])
  })
})

describe('the shape of a condition', () => {
  it('is an object', () => {
    expect(issuesOf(when('name'))).toEqual([
      'invalid_shape at affects.0.when: A condition is an object: "field" with an operator, "all" or "any"',
    ])
  })

  it('has a field and one operator', () => {
    expect(issuesOf(when({ field: 'name' }))).toEqual([
      'invalid_shape at affects.0.when: A condition needs an operator: "equals", "notEquals", "in", "includes", "empty", "notEmpty"',
    ])
    expect(issuesOf(when({ field: 'name', equals: 'a', in: ['a'] }))).toEqual([
      'invalid_shape at affects.0.when: A condition has one operator, not "equals", "in"',
    ])
    expect(issuesOf(when({ equals: 'a' }))).toEqual([
      'invalid_shape at affects.0.when.field: "field" is the dot path of a field, like "address.city"',
    ])
    expect(issuesOf(when({ field: '', equals: 'a' }))).toEqual([
      'invalid_shape at affects.0.when.field: "field" is the dot path of a field, like "address.city"',
    ])
  })

  it('reports a misspelled operator as an unknown key', () => {
    expect(issuesOf(when({ field: 'name', equal: 'a' }))).toEqual([
      'unknown_key at affects.0.when.equal: Unknown key "equal" on a condition',
    ])
  })

  it('takes values of the shape of its operator', () => {
    expect(issuesOf(when({ field: 'name', equals: null }))).toEqual([
      'invalid_shape at affects.0.when.equals: "equals" is a string, a number or a boolean',
    ])
    expect(issuesOf(when({ field: 'name', in: [] }))).toEqual([
      'invalid_shape at affects.0.when.in: "in" is a list of at least one string, number or boolean',
    ])
    expect(issuesOf(when({ field: 'name', in: ['a', {}] }))).toEqual([
      'invalid_shape at affects.0.when.in: "in" is a list of at least one string, number or boolean',
    ])
    expect(issuesOf(when({ field: 'name', empty: false }))).toEqual([
      'invalid_shape at affects.0.when.empty: "empty" is true. For the opposite, use "notEmpty"',
    ])
    expect(issuesOf(when({ field: 'name', notEmpty: 'yes' }))).toEqual([
      'invalid_shape at affects.0.when.notEmpty: "notEmpty" is true. For the opposite, use "empty"',
    ])
  })

  it('joins conditions with all or any, at any depth', () => {
    const nested = {
      all: [
        { field: 'name', notEmpty: true },
        { any: [{ field: 'age', equals: 20 }, { all: [{ field: 'nope', empty: true }] }] },
      ],
    }
    expect(issuesOf(when(nested))).toEqual([
      'unknown_field at affects.0.when.all.1.any.1.all.0.field: Unknown field "nope"',
    ])
    expect(issuesOf(when({ all: [] }))).toEqual([
      'invalid_shape at affects.0.when.all: "all" is a list of at least one condition',
    ])
    expect(issuesOf(when({ any: {} }))).toEqual([
      'invalid_shape at affects.0.when.any: "any" is a list of at least one condition',
    ])
    expect(issuesOf(when({ all: [{ field: 'name', empty: true }], field: 'name' }))).toEqual([
      'invalid_shape at affects.0.when: A condition has one of "all", "any" and "field", not "all" and "field"',
    ])
    expect(issuesOf(when({ any: [{ field: 'name', empty: true }], empty: true }))).toEqual([
      'unknown_key at affects.0.when.empty: Unknown key "empty" on a condition',
    ])
  })
})

describe('the field a condition reads', () => {
  it('is a field with a value', () => {
    expect(issuesOf(when({ field: 'nope', empty: true }))).toEqual([
      'unknown_field at affects.0.when.field: Unknown field "nope"',
    ])
    expect(issuesOf(when({ field: 'title', empty: true }))).toEqual([
      'unknown_field at affects.0.when.field: Unknown field "title"',
    ])
    expect(issuesOf(when({ field: 'lines.0.kind', empty: true }))).toEqual([
      'unknown_field at affects.0.when.field: Unknown field "lines.0.kind". A list\'s items are read with "*": "lines.*.kind"',
    ])
  })

  it('is read from the same item of a list, from a field inside that item', () => {
    expect(issuesOf(when({ field: 'lines.*.kind', empty: true }))).toEqual([
      'unknown_field at affects.0.when.field: "lines.*.kind" is read from each item of "lines", so "x" must be too',
    ])
    const inItem = form({
      name: 'lines',
      type: 'array',
      fields: [
        { name: 'kind', type: 'text' },
        { name: 'sku', type: 'text', affects: when({ field: 'lines.*.kind', equals: 'product' }) },
      ],
    } as JsonField)
    expect(definitionIssues(inItem)).toEqual([])
  })

  it('has no issues of its own, or they are reported once', () => {
    const json = form({ name: 'a', type: 'text', rules: [{ rule: 'nope' }] }, {
      name: 'b',
      type: 'text',
      affects: when({ field: 'a', empty: true }),
    } as JsonField)
    expect(definitionIssues(json)).toEqual([
      'unknown_rule at fields.0.rules.0.rule: Unknown rule "nope"',
    ])
  })
})

describe('the operators', () => {
  const fits = (field: string, operator: string, value: unknown = true) =>
    issuesOf(when({ field, [operator]: value })).length === 0

  it('compare the values of strings, numbers, booleans and dates', () => {
    for (const [field, value] of [
      ['name', 'a'],
      ['age', 20],
      ['agree', true],
      ['born', '2026-11-09'],
      ['size', 'm'],
    ] as const) {
      expect(fits(field, 'equals', value), field).toBe(true)
      expect(fits(field, 'notEquals', value), field).toBe(true)
      expect(fits(field, 'in', [value]), field).toBe(true)
      expect(fits(field, 'empty'), field).toBe(true)
      expect(fits(field, 'notEmpty'), field).toBe(true)
    }
  })

  it('compare no list, file or group', () => {
    expect(issuesOf(when({ field: 'topics', equals: 1 }))).toEqual([
      'kind_mismatch at affects.0.when.equals: "equals" can\'t be used on array fields, like "topics"',
    ])
    expect(issuesOf(when({ field: 'photo', in: ['a'] }))).toEqual([
      'kind_mismatch at affects.0.when.in: "in" can\'t be used on file fields, like "photo"',
    ])
    expect(issuesOf(when({ field: 'address', notEmpty: true }))).toEqual([
      'kind_mismatch at affects.0.when.notEmpty: "notEmpty" can\'t be used on object fields, like "address"',
    ])
  })

  it('tell whether a list or a file is empty', () => {
    for (const field of ['topics', 'tags', 'lines', 'photo', 'photos']) {
      expect(fits(field, 'empty'), field).toBe(true)
      expect(fits(field, 'notEmpty'), field).toBe(true)
    }
  })

  it('find a value among the items of a multiselect or a list of single values', () => {
    expect(fits('topics', 'includes', 1)).toBe(true)
    expect(fits('tags', 'includes', 'ab')).toBe(true)
    expect(issuesOf(when({ field: 'lines', includes: 'a' }))).toEqual([
      'kind_mismatch at affects.0.when.includes: "includes" can\'t be used on lists of objects, like "lines"',
    ])
    expect(issuesOf(when({ field: 'photos', includes: 'a' }))).toEqual([
      'kind_mismatch at affects.0.when.includes: "includes" can\'t be used on lists of file items, like "photos"',
    ])
    expect(issuesOf(when({ field: 'name', includes: 'a' }))).toEqual([
      'kind_mismatch at affects.0.when.includes: "includes" can\'t be used on string fields, like "name"',
    ])
  })
})

describe('the values a condition compares with', () => {
  it('are values the field can hold', () => {
    expect(issuesOf(when({ field: 'size', equals: 'xl' }))).toEqual([
      expect.stringMatching(/^invalid_value at affects\.0\.when\.equals: "size" can't hold "xl": /),
    ])
    expect(issuesOf(when({ field: 'age', notEquals: '20' }))).toEqual([
      expect.stringMatching(
        /^invalid_value at affects\.0\.when\.notEquals: "age" can't hold "20": /,
      ),
    ])
    expect(issuesOf(when({ field: 'born', equals: '9.11.2026' }))).toEqual([
      expect.stringMatching(
        /^invalid_value at affects\.0\.when\.equals: "born" can't hold "9.11.2026": /,
      ),
    ])
  })

  it("pass the field's rules", () => {
    expect(issuesOf(when({ field: 'age', in: [20, 5] }))).toEqual([
      'invalid_value at affects.0.when.in.1: "age" can\'t hold 5: Invalid value: Expected >=18 but received 5',
    ])
    expect(issuesOf(when({ field: 'agree', equals: false }))).toEqual([
      'invalid_value at affects.0.when.equals: "agree" can\'t hold false: Required',
    ])
  })

  it('are items the list can hold, for includes', () => {
    expect(issuesOf(when({ field: 'topics', includes: 3 }))).toEqual([
      expect.stringMatching(
        /^invalid_value at affects\.0\.when\.includes: "topics" can't hold 3: /,
      ),
    ])
    expect(issuesOf(when({ field: 'tags', includes: 'long' }))).toEqual([
      expect.stringMatching(
        /^invalid_value at affects\.0\.when\.includes: "tags" can't hold "long": /,
      ),
    ])
  })

  it("aren't empty, which never match", () => {
    expect(issuesOf(when({ field: 'name', equals: '' }))).toEqual([
      'invalid_value at affects.0.when.equals: "" is no value, so it never matches. Use "empty" or "notEmpty"',
    ])
  })
})

describe('a loop of conditions', () => {
  it('is reported, naming the fields in it', () => {
    const json = form(
      { name: 'a', type: 'text', affects: when({ field: 'b', notEmpty: true }) } as JsonField,
      {
        name: 'b',
        type: 'text',
        affects: [{ effect: 'hide', when: { field: 'a', empty: true } }],
      } as JsonField,
    )
    expect(definitionIssues(json)).toEqual([
      'cycle at fields.0.affects.0.when.field: Conditions depend on each other in a loop: "a" → "b" → "a"',
    ])
  })

  it('takes in a group that reads a field of its own', () => {
    const json = form({
      name: 'company',
      type: 'group',
      affects: when({ field: 'company.name', notEmpty: true }),
      fields: [{ name: 'name', type: 'text' }],
    } as JsonField)
    expect(definitionIssues(json)).toEqual([
      'cycle at fields.0.affects.0.when.field: Conditions depend on each other in a loop: "company" → "company.name" → "company"',
    ])
  })
})

describe('affects on the layout', () => {
  const layout = (step: object): JsonForm => ({
    ...form({ name: 'a', type: 'text' }, { name: 'b', type: 'text' }),
    layout: { steps: [{ items: ['a'] }, step] } as never,
  })

  it('are checked on steps, sections and display elements', () => {
    expect(
      definitionIssues(
        layout({
          affects: when({ field: 'nope', empty: true }),
          items: [
            { type: 'section', affects: 'show', items: ['b'] },
            { type: 'paragraph', text: 'P', affects: [{ effect: 'hide' }] },
          ],
        }),
      ),
    ).toEqual([
      'unknown_field at layout.steps.1.affects.0.when.field: Unknown field "nope"',
      'invalid_shape at layout.steps.1.items.0.affects: "affects" is a list of { "effect", "when" }',
      'invalid_shape at layout.steps.1.items.1.affects.0: An affect needs "when", its condition',
    ])
  })

  it("read the fields of the items of a list only in the layout of the list's items", () => {
    const json: JsonForm = {
      ...form({ name: 'lines', type: 'array', fields: [{ name: 'kind', type: 'text' }] }),
      layout: {
        items: [
          {
            field: 'lines',
            items: [
              'kind',
              {
                type: 'paragraph',
                text: 'P',
                affects: when({ field: 'lines.*.kind', notEmpty: true }),
              },
            ],
          },
          {
            type: 'section',
            affects: when({ field: 'lines.*.kind', notEmpty: true }),
            items: [{ type: 'divider' }],
          },
        ],
      } as never,
    }
    expect(definitionIssues(json)).toEqual([
      'unknown_field at layout.items.1.affects.0.when.field: "lines.*.kind" is read from each item of "lines", so the section must be too',
    ])
  })
})
