import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import {
  createSchemaBuilder,
  type ExtensionContext,
  type JsonField,
  type JsonForm,
  type ResolvedField,
  type SchemaExtension,
  type TargetFill,
} from '@whatsaaaa/form-builder-schema'
import { form } from '../helpers'
import { prefill } from '../fills/prefill'

const builder = createSchemaBuilder({ extensions: [prefill()] })

/** An extension that runs `check` with the context, and adds no conditions. */
const withContext = (check: (ctx: ExtensionContext) => void): SchemaExtension => ({
  name: 'test',
  check(ctx) {
    check(ctx)
    return new Map()
  },
})

const fields: JsonField[] = [
  { name: 'profile', type: 'text' },
  { name: 'photo', type: 'file' },
  { name: 'tags', type: 'multiselect', options: [{ value: 'a', label: 'A' }] },
  { name: 'address', type: 'group', fields: [{ name: 'city', type: 'text' }] },
  { name: 'lines', type: 'array', fields: [{ name: 'sku', type: 'text' }] },
  { type: 'heading', text: 'About you' },
  { name: 'scans', type: 'file', multiple: true },
]

describe('a resolved field', () => {
  it('has its role', () => {
    const roles: Record<string, ResolvedField['role']> = {}
    const extension = withContext((ctx) => {
      const [profile] = ctx.targets
      for (const path of ['profile', 'tags', 'address', 'lines', 'address.city']) {
        const field = ctx.resolve(path, profile as never)
        if (field && typeof field !== 'string') roles[path] = field.role
      }
    })
    createSchemaBuilder({ extensions: [extension] }).validate(form(...fields))
    expect(roles).toEqual({
      profile: 'value',
      tags: 'value',
      address: 'group',
      lines: 'array',
      'address.city': 'value',
    })
  })
})

describe('ctx.fill()', () => {
  /** The TypeError adding a fill from `trigger` to `sets` throws, or undefined when it doesn't. */
  function failure(trigger: string, sets: string[], extra: Partial<TargetFill> = {}) {
    let thrown: unknown
    const extension = withContext((ctx) => {
      const target = ctx.targets.find(
        (each) =>
          each.kind === 'field' && (each.field.dataPath.join('.') || each.field.type) === trigger,
      )
      const resolved = sets.map(
        (path) => ctx.resolve(path, ctx.targets[0] as never) as ResolvedField,
      )
      try {
        ctx.fill(target as never, {
          fields: resolved.map((field) => ({ field, at: [] })),
          overwrite: 'unedited',
          static: true,
          values: () => null,
          ...extra,
        })
      } catch (error) {
        thrown = error
      }
    })
    createSchemaBuilder({ extensions: [extension] }).validate(form(...fields))
    return thrown instanceof Error ? thrown.message : thrown
  }

  it('takes a trigger with a single value and fields with a value outside list items', () => {
    expect(failure('profile', ['address.city', 'tags'])).toBeUndefined()
    expect(failure('profile', [], { overwrite: 'always' })).toBeUndefined()
  })

  it('throws a TypeError for a trigger that has no single value, or is in a list item', () => {
    expect(failure('heading', ['profile'])).toBe(
      'Extension "test": a fill\'s trigger has a string, number, boolean or date value, unlike the heading at fields[5]',
    )
    for (const trigger of ['tags', 'address', 'photo']) {
      expect(failure(trigger, ['profile'])).toBe(
        `Extension "test": a fill's trigger has a string, number, boolean or date value, unlike "${trigger}"`,
      )
    }
    expect(failure('lines.*.sku', ['profile'])).toBe(
      'Extension "test": a fill can\'t be on "lines.*.sku", inside a list\'s items',
    )
  })

  it('throws a TypeError for a field to set that it can never set', () => {
    expect(failure('profile', ['address'])).toBe(
      'Extension "test": a fill sets fields with a value, not "address"',
    )
    expect(failure('profile', ['photo'])).toBe(
      'Extension "test": a fill can\'t set a file, like "photo"',
    )
    expect(failure('profile', ['scans'])).toBe(
      'Extension "test": a fill can\'t set a file, like "scans"',
    )
    expect(failure('profile', ['address.city', 'address.city'])).toBe(
      'Extension "test": the fill of "profile" sets "address.city" twice',
    )
    expect(failure('profile', ['profile'], { overwrite: 'sometimes' as never })).toBe(
      'Extension "test": the overwrite of a fill is \'unedited\' or \'always\', not "sometimes"',
    )
  })

  it('leaves out a fill on a trigger with issues of its own, which the definition reports', () => {
    const json = form(
      { name: 'a', type: 'text' },
      { name: 'a', type: 'text' },
      { name: 'b', type: 'text' },
      { name: 'c', type: 'text', nope: 1 } as never,
    )
    const extension = withContext((ctx) => {
      const b = ctx.resolve('b', ctx.targets[0] as never) as ResolvedField
      for (const target of ctx.targets) {
        if (target.kind !== 'field' || target.field.field.name === 'b') continue
        ctx.fill(target, {
          fields: [{ field: b, at: [] }],
          overwrite: 'unedited',
          static: true,
          values: () => null,
        })
      }
    })
    const issues = createSchemaBuilder().validate(json).issues
    expect(issues.map(({ code }) => code)).toEqual(['duplicate_name', 'unknown_key'])
    expect(createSchemaBuilder({ extensions: [extension] }).validate(json).issues).toEqual(issues)
  })

  it("throws a TypeError for a field inside a list's items", () => {
    let thrown: unknown
    const extension = withContext((ctx) => {
      const sku = ctx.targets.find(
        (each) => each.kind === 'field' && each.field.field.name === 'sku',
      )
      const field = ctx.resolve('lines.*.sku', sku as never) as ResolvedField
      try {
        ctx.fill(ctx.targets[0] as never, {
          fields: [{ field, at: [] }],
          overwrite: 'unedited',
          static: false,
          values: () => null,
        })
      } catch (error) {
        thrown = error
      }
    })
    createSchemaBuilder({ extensions: [extension] }).validate(form(...fields))
    expect(thrown).toEqual(
      new TypeError('Extension "test": a fill can\'t set "lines.*.sku", inside a list\'s items'),
    )
  })

  it("throws a TypeError for a target or a field that isn't this definition's", () => {
    let other: ResolvedField | undefined
    const keep = withContext((ctx) => {
      other = ctx.resolve('profile', ctx.targets[0] as never) as ResolvedField
    })
    createSchemaBuilder({ extensions: [keep] }).validate(form(...fields))
    const errors: unknown[] = []
    const extension = withContext((ctx) => {
      const fill: TargetFill = {
        fields: [{ field: other as ResolvedField, at: [] }],
        overwrite: 'unedited',
        static: true,
        values: () => null,
      }
      for (const trigger of [ctx.targets[0], { ...ctx.targets[0], kind: 'step' }]) {
        try {
          ctx.fill(trigger as never, trigger === ctx.targets[0] ? fill : { ...fill, fields: [] })
        } catch (error) {
          errors.push(error)
        }
      }
    })
    createSchemaBuilder({ extensions: [extension] }).validate(form(...fields))
    expect(errors).toEqual([
      new TypeError('Extension "test": a fill sets the fields ctx.resolve() gives'),
      new TypeError('Extension "test": ctx.fill() takes a field of ctx.targets'),
    ])
  })
})

describe('a loop of fills', () => {
  it('is a cycle where a fill sets its own trigger', () => {
    const json = form({
      name: 'profile',
      type: 'text',
      prefill: { map: { a: { profile: 'b' } } },
    } as never)
    expect(builder.validate(json).issues).toEqual([
      {
        code: 'cycle',
        path: ['fields', 0, 'prefill', 'map', 'a', 'profile'],
        message: '"profile" fills itself',
      },
    ])
  })

  it('is a cycle where fills set each other, reported where the last names the first', () => {
    const json = form(
      { name: 'c', type: 'text' },
      { name: 'a', type: 'text', prefill: { source: 'x', fields: ['c', 'group.b'] } } as never,
      {
        name: 'group',
        type: 'group',
        fields: [{ name: 'b', type: 'text', prefill: { map: { y: { a: '1' } } } } as never],
      },
    )
    const extension = prefill({ x: () => null })
    expect(createSchemaBuilder({ extensions: [extension] }).validate(json).issues).toEqual([
      {
        code: 'cycle',
        path: ['fields', 2, 'fields', 0, 'prefill', 'map', 'y', 'a'],
        message: 'Fills set each other in a loop: "a" → "group.b" → "a"',
      },
    ])
  })

  it("isn't made by fills that set the same field, or a chain", () => {
    const json = form(
      { name: 'a', type: 'text', prefill: { map: { x: { b: '1', c: '1' } } } } as never,
      { name: 'b', type: 'text', prefill: { map: { y: { c: '2' } } } } as never,
      { name: 'c', type: 'text' },
    )
    expect(builder.validate(json).issues).toEqual([])
  })
})

describe('a definition with fills', () => {
  const json: JsonForm = form(
    {
      name: 'profile',
      type: 'select',
      default: 'a',
      options: [
        { value: 'a', label: 'Profile A' },
        { value: 'b', label: 'Profile B' },
      ],
      prefill: { map: { a: { firstName: 'Marko', lastName: 'Petrović' } } },
    } as never,
    { name: 'firstName', type: 'text', required: true },
    { name: 'lastName', type: 'text' },
  )

  it('starts with the values of the fills written in it', () => {
    expect(builder.getInitialInput(json)).toEqual({
      profile: 'a',
      firstName: 'Marko',
      lastName: 'Petrović',
    })
  })

  it('has no fills while it has issues', () => {
    const broken = { ...json, fields: [...json.fields, { name: 'x', type: 'nope' }] }
    expect(builder.getInitialInput(broken)).toEqual({ profile: 'a' })
    expect(() => builder.getFills(broken)).toThrow('Unknown field type "nope"')
  })

  it('builds the same schema as a builder without extensions', () => {
    const plain = createSchemaBuilder().build(
      form(
        ...json.fields.map(
          (field) =>
            Object.fromEntries(
              Object.entries(field).filter(([key]) => key !== 'prefill'),
            ) as JsonField,
        ),
      ),
    )
    const schema = builder.build(json)
    expect(schema.type).toBe('object')
    expect('pipe' in schema).toBe(false)
    expect(Object.keys(schema.entries)).toEqual(Object.keys(plain.entries))
    expect(v.safeParse(schema, { profile: 'a', firstName: '' }).issues?.[0]?.message).toBe(
      'Required',
    )
  })

  it('reports a source an extension does not know as unknown_source', () => {
    const issues = builder.validate(
      form({ name: 'profile', type: 'text', prefill: { source: 'nope', fields: ['x'] } } as never),
    ).issues
    expect(issues).toEqual([
      {
        code: 'unknown_source',
        path: ['fields', 0, 'prefill', 'source'],
        message: 'Unknown source "nope"',
      },
    ])
  })
})
