import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { createSchemaBuilder, type JsonField, type JsonForm } from '@whatsaaaa/form-builder-schema'
import { form } from '../helpers'
import { hideWhen, otherWhen } from './hide-when'

const builder = createSchemaBuilder({ extensions: [hideWhen()] })

/** Each issue's message and its path, as Formisch reads it. */
const issuesOf = (json: JsonForm, input: unknown) =>
  v.safeParse(builder.build(json), input).issues?.map((issue) => ({
    path: issue.path?.map((item) => item.key) ?? [],
    message: issue.message,
  })) ?? []

const outputOf = (json: JsonForm, input: unknown) => v.parse(builder.build(json), input)

const toggle: JsonField = { name: 'hide', type: 'checkbox' }

describe('a hidden field', () => {
  const json = form(toggle, {
    name: 'age',
    type: 'number',
    required: true,
    rules: [{ rule: 'minValue', value: 18 }],
    hideWhen: { field: 'hide' },
  })

  it('validates as it always did while it is shown', () => {
    expect(issuesOf(json, { hide: false, age: undefined })).toEqual([
      { path: ['age'], message: 'Required' },
    ])
    expect(issuesOf(json, { hide: false, age: 5 })).toEqual([
      { path: ['age'], message: 'Invalid value: Expected >=18 but received 5' },
    ])
  })

  it('reports nothing while it is hidden, not even a missing value', () => {
    expect(issuesOf(json, { hide: true })).toEqual([])
    expect(issuesOf(json, { hide: true, age: 'abc' })).toEqual([])
  })

  it('submits its output when it is valid, and nothing when it is not', () => {
    expect(outputOf(json, { hide: true, age: 40 })).toEqual({ hide: true, age: 40 })
    expect(outputOf(json, { hide: true, age: 5 })).toEqual({ hide: true, age: undefined })
    expect(outputOf(json, { hide: true, age: 'abc' })).toEqual({ hide: true, age: undefined })
  })

  it('applies its normalize rules to what it submits', () => {
    const trimmed = form(toggle, {
      name: 'note',
      type: 'text',
      rules: [{ rule: 'trim' }],
      hideWhen: { field: 'hide' },
    })
    expect(outputOf(trimmed, { hide: true, note: '  hi ' })).toEqual({ hide: true, note: 'hi' })
  })

  it('submits nothing when its conditions clear it', () => {
    const cleared = form(toggle, {
      name: 'age',
      type: 'number',
      required: true,
      hideWhen: { field: 'hide', clear: true },
    })
    expect(outputOf(cleared, { hide: true, age: 40 })).toEqual({ hide: true, age: undefined })
  })
})

describe('a hidden group', () => {
  const json = form(toggle, {
    name: 'company',
    type: 'group',
    hideWhen: { field: 'hide' },
    fields: [
      { type: 'heading', text: 'Company' },
      { name: 'name', type: 'text', required: true },
      { name: 'size', type: 'number', rules: [{ rule: 'minValue', value: 1 }] },
    ],
  })

  it('hides every field inside it, which each decide what they submit', () => {
    expect(issuesOf(json, { hide: true, company: { size: 0 } })).toEqual([])
    expect(outputOf(json, { hide: true, company: { name: 'Acme', size: 0 } })).toEqual({
      hide: true,
      company: { name: 'Acme', size: undefined },
    })
  })

  it('clears every field inside it, when its conditions clear it', () => {
    const cleared = form(toggle, {
      ...(json.fields[1] as JsonField),
      hideWhen: { field: 'hide', clear: true },
    })
    expect(outputOf(cleared, { hide: true, company: { name: 'Acme', size: 3 } })).toEqual({
      hide: true,
      company: { name: undefined, size: undefined },
    })
  })

  it('is filled in when the input has none', () => {
    expect(outputOf(json, { hide: true })).toEqual({
      hide: true,
      company: { name: undefined, size: undefined },
    })
  })
})

describe('a hidden array', () => {
  const lines = (clear: boolean): JsonForm =>
    form(toggle, {
      name: 'lines',
      type: 'array',
      required: true,
      rules: [{ rule: 'maxLength', value: 2 }],
      hideWhen: { field: 'hide', clear },
      fields: [{ name: 'qty', type: 'number', required: true }],
    })

  it('skips its own rules', () => {
    expect(issuesOf(lines(false), { hide: true, lines: [] })).toEqual([])
    expect(issuesOf(lines(false), { hide: true, lines: [{}, {}, {}] })).toEqual([])
  })

  it('submits its items when its own rules pass, and none when they fail', () => {
    expect(outputOf(lines(false), { hide: true, lines: [{ qty: 1 }, { qty: 'x' }] })).toEqual({
      hide: true,
      lines: [{ qty: 1 }, { qty: undefined }],
    })
    expect(outputOf(lines(false), { hide: true, lines: [{}, {}, {}] })).toEqual({
      hide: true,
      lines: [],
    })
  })

  it('submits no items when its conditions clear it', () => {
    expect(outputOf(lines(true), { hide: true, lines: [{ qty: 1 }] })).toEqual({
      hide: true,
      lines: [],
    })
  })
})

describe('a field hidden in an array item', () => {
  const json = form({
    name: 'lines',
    type: 'array',
    rules: [{ rule: 'maxLength', value: 2 }],
    fields: [
      { name: 'kind', type: 'text' },
      {
        name: 'qty',
        type: 'number',
        required: true,
        hideWhen: { field: 'lines.*.kind', equals: 'x' },
      },
    ],
  })

  it('is hidden in the items whose own fields hide it', () => {
    expect(
      issuesOf(json, {
        lines: [
          { kind: 'x', qty: undefined },
          { kind: 'y', qty: undefined },
        ],
      }),
    ).toEqual([{ path: ['lines', 1, 'qty'], message: 'Required' }])
  })

  it("keeps its array's own rules, even with a value that isn't valid", () => {
    expect(
      issuesOf(json, { lines: [{ kind: 'x', qty: 'a' }, { kind: 'x' }, { kind: 'x' }] }),
    ).toEqual([{ path: ['lines'], message: 'Invalid length: Expected <=2 but received 3' }])
  })
})

describe('form rules', () => {
  const json: JsonForm = {
    ...form(
      toggle,
      { name: 'zip', type: 'text', hideWhen: { field: 'hide' } },
      { name: 'confirmZip', type: 'text' },
    ),
    formRules: [{ rule: 'sameAs', field: 'confirmZip', other: 'zip', message: 'The ZIPs differ' }],
  }

  it('run while every field they read is shown', () => {
    expect(issuesOf(json, { hide: false, zip: '1', confirmZip: '2' })).toEqual([
      { path: ['confirmZip'], message: 'The ZIPs differ' },
    ])
  })

  it("are skipped while a field they read is hidden, or the one they're on", () => {
    expect(issuesOf(json, { hide: true, zip: '1', confirmZip: '2' })).toEqual([])
    const onHidden: JsonForm = {
      ...form(
        toggle,
        { name: 'zip', type: 'text' },
        { name: 'confirmZip', type: 'text', hideWhen: { field: 'hide' } },
      ),
      formRules: json.formRules,
    }
    expect(issuesOf(onHidden, { hide: true, zip: '1', confirmZip: '2' })).toEqual([])
  })

  it('run per item, skipping the items where a field they read is hidden', () => {
    const items: JsonForm = {
      ...form({
        name: 'lines',
        type: 'array',
        fields: [
          { name: 'skip', type: 'checkbox' },
          { name: 'a', type: 'text' },
          { name: 'b', type: 'text', hideWhen: { field: 'lines.*.skip' } },
        ],
      }),
      formRules: [{ rule: 'sameAs', field: 'lines.*.b', other: 'lines.*.a', message: 'Differ' }],
    }
    const input = {
      lines: [
        { skip: true, a: '1', b: '2' },
        { skip: false, a: '1', b: '2' },
      ],
    }
    expect(issuesOf(items, input)).toEqual([{ path: ['lines', 1, 'b'], message: 'Differ' }])
  })
})

describe('a chain of conditions', () => {
  it('reads a hidden field as empty', () => {
    const json = form(
      toggle,
      { name: 'a', type: 'text', hideWhen: { field: 'hide' } },
      { name: 'b', type: 'text', required: true, hideWhen: { field: 'a', equals: 'x' } },
    )
    expect(issuesOf(json, { hide: false, a: 'x', b: undefined })).toEqual([])
    expect(issuesOf(json, { hide: true, a: 'x', b: undefined })).toEqual([
      { path: ['b'], message: 'Required' },
    ])
  })
})

describe('the steps and sections of a layout', () => {
  const json: JsonForm = {
    ...form(
      toggle,
      { name: 'name', type: 'text', required: true },
      { name: 'vat', type: 'text', required: true },
    ),
    layout: {
      steps: [
        { items: ['hide'] },
        { hideWhen: { field: 'hide' }, items: ['name'] },
        { items: [{ type: 'section', hideWhen: { field: 'hide', clear: true }, items: ['vat'] }] },
      ],
    } as never,
  }

  it('hide the fields placed in them, and clear them', () => {
    expect(issuesOf(json, { hide: false, name: undefined, vat: undefined })).toEqual([
      { path: ['name'], message: 'Required' },
      { path: ['vat'], message: 'Required' },
    ])
    expect(outputOf(json, { hide: true, name: 'Ana', vat: 'DE1' })).toEqual({
      hide: true,
      name: 'Ana',
      vat: undefined,
    })
  })
})

describe('a definition without conditions', () => {
  it('builds the same schema as a builder without extensions', () => {
    const json = form({ name: 'a', type: 'text', required: true })
    const schema = builder.build(json)
    expect(schema.type).toBe('object')
    expect('pipe' in schema).toBe(false)
    expect(v.safeParse(schema, { a: undefined }).issues?.[0]?.message).toBe('Required')
  })

  it("keeps a form rules' pipe as it was", () => {
    const json: JsonForm = {
      ...form({ name: 'a', type: 'text' }, { name: 'b', type: 'text' }),
      formRules: [{ rule: 'sameAs', field: 'b', other: 'a', message: 'Differ' }],
    }
    const schema = builder.build(json) as { pipe?: readonly unknown[] }
    expect(schema.pipe).toHaveLength(2)
  })
})

describe('the initial input', () => {
  it('leaves out the default of a field that starts cleared', () => {
    const json = form(
      { name: 'same', type: 'checkbox', default: true },
      {
        name: 'shipping',
        type: 'group',
        hideWhen: { field: 'same', equals: true, clear: true },
        fields: [
          { name: 'country', type: 'text', default: 'DE' },
          {
            name: 'tags',
            type: 'array',
            default: [{ x: 'a' }],
            fields: [{ name: 'x', type: 'text' }],
          },
        ],
      },
      { name: 'note', type: 'text', default: 'hi', hideWhen: { field: 'same' } },
    )
    expect(builder.getInitialInput(json)).toEqual({
      same: true,
      shipping: { tags: [] },
      note: 'hi',
    })
  })
})

describe('resolveMessage', () => {
  it('sees each message once, though the fields are built again in their gates', () => {
    const seen: string[] = []
    const counting = createSchemaBuilder({
      extensions: [hideWhen()],
      resolveMessage: (key) => {
        seen.push(key)
        return `t:${key}`
      },
    })
    const json = form(toggle, {
      name: 'a',
      type: 'text',
      label: 'A',
      required: true,
      hideWhen: { field: 'hide' },
    })
    const schema = counting.build(json)
    expect([...seen].sort()).toEqual(['A', 'Required'])
    expect(v.safeParse(schema, { hide: false, a: undefined }).issues?.[0]?.message).toBe(
      't:Required',
    )
  })
})

describe('several extensions', () => {
  const both = createSchemaBuilder({ extensions: [hideWhen(), otherWhen()] })

  it('hide a field when any of them does, and clear it when any of them does', () => {
    const json = form(
      { name: 'a', type: 'checkbox' },
      { name: 'b', type: 'checkbox' },
      {
        name: 'c',
        type: 'text',
        required: true,
        hideWhen: { field: 'a' },
        otherWhen: { field: 'b', clear: true },
      },
    )
    const schema = both.build(json)
    const issues = (input: object) => v.safeParse(schema, input).issues?.length ?? 0
    expect(issues({ a: false, b: false, c: undefined })).toBe(1)
    expect(issues({ a: true, b: false, c: undefined })).toBe(0)
    expect(issues({ a: false, b: true, c: undefined })).toBe(0)
    expect(v.parse(schema, { a: true, b: false, c: 'x' })).toEqual({ a: true, b: false, c: 'x' })
    expect(v.parse(schema, { a: true, b: true, c: 'x' })).toEqual({
      a: true,
      b: true,
      c: undefined,
    })
  })
})

describe('an input that is no form of the definition', () => {
  const json = form(
    { name: 'hide', type: 'checkbox' },
    {
      name: 'g',
      type: 'group',
      fields: [{ name: 'x', type: 'text', hideWhen: { field: 'hide' } }],
    },
    {
      name: 'lines',
      type: 'array',
      fields: [{ name: 'y', type: 'text', hideWhen: { field: 'hide' } }],
    },
  )

  it('gets the issues of the schema, as it would without conditions', () => {
    expect(issuesOf(json, { hide: true, g: 'nope', lines: 'nope' })).toEqual([
      { path: ['g'], message: 'Invalid type: Expected Object but received "nope"' },
      { path: ['lines'], message: 'Invalid type: Expected Array but received "nope"' },
    ])
    expect(issuesOf(json, { hide: true, g: {}, lines: [null] })).toEqual([
      { path: ['lines', 0], message: 'Invalid type: Expected Object but received null' },
    ])
    expect(issuesOf(json, null)).toEqual([
      { path: [], message: 'Invalid type: Expected Object but received null' },
    ])
  })
})
