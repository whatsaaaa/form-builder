import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import {
  createSchemaBuilder,
  fieldPathsOf,
  issuesOfStep,
  type JsonForm,
} from '@whatsaaaa/form-builder-schema'

const builder = createSchemaBuilder()

const json: JsonForm = {
  version: '1',
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'address', type: 'group', fields: [{ name: 'city', type: 'text', required: true }] },
    { name: 'tags', type: 'array', of: { type: 'text', required: true } },
    {
      name: 'lines',
      type: 'array',
      required: true,
      fields: [{ name: 'product', type: 'text', required: true }],
    },
  ],
  layout: {
    steps: [
      { items: ['email', 'name'] },
      { items: [{ field: 'lines', items: ['product'] }, 'address.city', 'tags'] },
    ],
  },
}

const [one, two] = builder.getLayout(json).steps
const schema = builder.build(json)
const issuesOf = (input: unknown) => v.safeParse(schema, input).issues

describe('issuesOfStep', () => {
  it('gives the issues on the fields of the step, in layout order', () => {
    const issues = issuesOf({ address: {}, tags: [], lines: [] })

    expect(issuesOfStep(one!, issues).map(({ path, field }) => [path, field.type])).toEqual([
      [['email'], 'email'],
      [['name'], 'text'],
    ])
    expect(issuesOfStep(two!, issues).map(({ path }) => path)).toEqual([
      ['lines'],
      ['address', 'city'],
    ])
  })

  it('finds the fields of array items by their index', () => {
    const issues = issuesOf({
      name: 'A',
      email: 'a@b.cd',
      address: { city: 'X' },
      tags: ['a', ''],
      lines: [{ product: 'P' }, { product: '' }],
    })
    const found = issuesOfStep(two!, issues)

    expect(found.map(({ path }) => path)).toEqual([
      ['lines', 1, 'product'],
      ['tags', 1],
    ])
    expect(found.map(({ field }) => field.dataPath)).toEqual([
      ['lines', '*', 'product'],
      ['tags', '*'],
    ])
    expect(found[0]?.issue.message).toBe('Required')
  })

  it('gives none without issues', () => {
    expect(issuesOfStep(one!, undefined)).toEqual([])
    expect(issuesOfStep(one!, [])).toEqual([])
  })

  it('leaves out an issue on no field, and reads a path the way Formisch does', () => {
    const issue = (path: v.IssuePathItem[] | undefined) =>
      ({
        kind: 'validation',
        type: 'check',
        input: 1,
        expected: null,
        received: '1',
        message: 'm',
        path,
      }) as v.BaseIssue<unknown>
    const item = (type: string, key: unknown) =>
      ({ type, origin: 'value', input: {}, key, value: 1 }) as v.IssuePathItem

    expect(issuesOfStep(one!, [issue(undefined)])).toEqual([])
    // A key in a map, or no string or number, ends the path, as in Formisch.
    expect(
      issuesOfStep(one!, [issue([item('object', 'email'), item('map', 'x')])]).map(
        ({ path }) => path,
      ),
    ).toEqual([['email']])
    expect(
      issuesOfStep(one!, [issue([item('object', 'name'), item('set', 'x')])]).map(
        ({ path }) => path,
      ),
    ).toEqual([['name']])
    expect(
      issuesOfStep(one!, [issue([item('object', 'email'), item('object', Symbol('x'))])]).map(
        ({ path }) => path,
      ),
    ).toEqual([['email']])
  })
})

describe('fieldPathsOf', () => {
  it('gives every path of the step for this input, with each array item', () => {
    const input = { tags: ['a', 'b'], lines: [{}, { product: 'P' }] }

    expect(fieldPathsOf(one!, input)).toEqual([['email'], ['name']])
    expect(fieldPathsOf(two!, input)).toEqual([
      ['lines'],
      ['lines', 0, 'product'],
      ['lines', 1, 'product'],
      ['address', 'city'],
      ['tags'],
      ['tags', 0],
      ['tags', 1],
    ])
  })

  it('gives no item paths for an array the input has not', () => {
    expect(fieldPathsOf(two!, {})).toEqual([['lines'], ['address', 'city'], ['tags']])
    expect(fieldPathsOf(two!, undefined)).toEqual([['lines'], ['address', 'city'], ['tags']])
  })
})
