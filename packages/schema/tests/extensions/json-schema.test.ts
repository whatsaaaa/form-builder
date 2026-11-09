import { Ajv } from 'ajv'
import * as v from 'valibot'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import {
  createSchemaBuilder,
  defineExtension,
  type SchemaExtension,
} from '@whatsaaaa/form-builder-schema'
import { toJsonSchema } from '@whatsaaaa/form-builder-schema/json-schema'
import defaultSchema from '../../definition.schema.json'
import { type HideWhen, hideWhen } from './hide-when'

const builder = createSchemaBuilder({ extensions: [hideWhen()] })
const schema = toJsonSchema(builder)
const validate = new Ajv({ allErrors: true, strict: false }).compile(schema)

const condition = { field: 'a', equals: 1, clear: true }

describe('toJsonSchema with extensions', () => {
  it("takes the extensions' keys on every field, display elements too", () => {
    expect(
      validate({
        version: '1',
        fields: [
          { name: 'a', type: 'text', hideWhen: condition },
          { type: 'heading', text: 'H', hideWhen: { field: 'a' } },
          {
            name: 'g',
            type: 'group',
            fields: [{ name: 'b', type: 'text', hideWhen: { field: 'a' } }],
          },
        ],
      }),
    ).toBe(true)
  })

  it('takes them on steps, sections and display elements of the layout, and not on rows', () => {
    const layout = (row: object) => ({
      version: '1',
      fields: [{ name: 'a', type: 'text' }],
      layout: {
        steps: [
          {
            hideWhen: condition,
            items: [
              { type: 'section', hideWhen: condition, items: ['a'] },
              { type: 'paragraph', text: 'P', hideWhen: condition },
              {
                type: 'row',
                items: [{ type: 'section', hideWhen: condition, items: ['*'] }],
                ...row,
              },
            ],
          },
        ],
      },
    })
    expect(validate(layout({}))).toBe(true)
    expect(validate(layout({ hideWhen: condition }))).toBe(false)
  })

  it('checks their values by the definitions they refer to', () => {
    expect(schema.definitions?.['hideWhen.condition']).toMatchObject({
      type: 'object',
      required: ['field'],
      additionalProperties: false,
    })
    const field = (hideWhen: unknown) => ({
      version: '1',
      fields: [{ name: 'a', type: 'text', hideWhen }],
    })
    expect(validate(field({ field: 'a', equals: [] }))).toBe(false)
    expect(validate(field({ field: 'a', nope: 1 }))).toBe(false)
  })

  it('is the default schema without extensions', () => {
    expect(toJsonSchema(createSchemaBuilder())).toEqual(defaultSchema)
  })

  it("warns about a definition it can't convert, and takes any value for it", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const odd = v.custom<string>(() => true)
    const extension: SchemaExtension = defineExtension({
      name: 'odd',
      fieldProps: v.object({ odd: v.optional(v.lazy(() => odd)) }),
      definitions: { odd },
      check: () => new Map(),
    })
    const json = toJsonSchema(createSchemaBuilder({ extensions: [extension] }))
    expect(json.definitions?.['odd.odd']).toEqual({})
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"odd.odd" can\'t be converted'))
    warn.mockRestore()
  })
})

describe('defineForm with extensions', () => {
  it("types the extensions' keys", () => {
    const json = builder.defineForm({
      version: '1',
      fields: [
        { name: 'a', type: 'text', hideWhen: { field: 'b' } },
        {
          name: 'g',
          type: 'group',
          fields: [{ name: 'b', type: 'text', hideWhen: { field: 'a' } }],
        },
      ],
      layout: {
        steps: [
          {
            hideWhen: { field: 'a' },
            items: [{ type: 'section', hideWhen: { field: 'a' }, items: ['*'] }],
          },
        ],
      },
    })
    type Field = (typeof json.fields)[number]
    expectTypeOf<Field['hideWhen']>().toEqualTypeOf<HideWhen | undefined>()

    builder.defineForm({
      version: '1',
      // @ts-expect-error -- `equals` takes a string, number or boolean.
      fields: [{ name: 'a', type: 'text', hideWhen: { field: 'b', equals: [] } }],
    })
    createSchemaBuilder().defineForm({
      version: '1',
      // @ts-expect-error -- without the extension, it is no key of a field.
      fields: [{ name: 'a', type: 'text', hideWhen: { field: 'b' } }],
    })
  })
})
