import { readFileSync } from 'node:fs'
import { Ajv } from 'ajv'
import { createSchemaBuilder } from '@whatsaaaa/form-builder-schema'
import { toJsonSchema } from '@whatsaaaa/form-builder-schema/json-schema'
import { type Affect, affects } from '@whatsaaaa/form-builder-affects'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { builder, fixtures, form } from './helpers'

const committed = JSON.parse(
  readFileSync(new URL('../definition.schema.json', import.meta.url), 'utf8'),
) as Record<string, unknown>
const validate = new Ajv({ allErrors: true, strict: false }).compile(committed)

describe('definition.schema.json', () => {
  it("is the schema of a builder with affects(): run `pnpm docs:gen` when it isn't", () => {
    const { description: _, ...made } = toJsonSchema(
      createSchemaBuilder({ extensions: [affects()] }),
    )
    const { description: __, $id, ...file } = committed
    expect($id).toBe(
      'https://whatsaaaa.github.io/form-builder/schema/v1/affects/definition.schema.json',
    )
    expect(file).toEqual(made)
  })

  it.each(Object.entries(fixtures))('takes the %s fixture', (_, json) => {
    expect(validate(json), JSON.stringify(validate.errors)).toBe(true)
  })

  it('rejects affects of the wrong shape, as validate() does', () => {
    const withAffects = (affects: unknown) => form({ name: 'a', type: 'text', affects } as never)
    for (const affects of [
      {},
      [{ effect: 'reveal', when: { field: 'a', empty: true } }],
      [{ effect: 'show' }],
      [{ effect: 'show', when: { field: 'a' } }],
      [{ effect: 'show', when: { field: 'a', equals: 1, in: [1] } }],
      [{ effect: 'show', when: { field: 'a', equal: 1 } }],
      [{ effect: 'show', when: { field: 'a', in: [] } }],
      [{ effect: 'show', when: { field: 'a', empty: false } }],
      [{ effect: 'show', when: { all: [] } }],
      [{ effect: 'show', when: { all: [{ field: 'a', empty: true }], field: 'a' } }],
    ]) {
      expect(validate(withAffects(affects)), JSON.stringify(affects)).toBe(false)
      expect(builder.validate(withAffects(affects)).success, JSON.stringify(affects)).toBe(false)
    }
  })
})

describe('defineForm', () => {
  it('types affects on fields, steps and sections', () => {
    const json = builder.defineForm({
      version: '1',
      fields: [
        { name: 'a', type: 'checkbox' },
        {
          name: 'b',
          type: 'text',
          affects: [{ effect: 'show', when: { field: 'a', equals: true } }],
        },
      ],
      layout: {
        steps: [
          { items: ['a'] },
          {
            affects: [{ effect: 'hideAndClear', when: { all: [{ field: 'a', notEquals: true }] } }],
            items: [
              {
                type: 'section',
                affects: [{ effect: 'hide', when: { field: 'a', empty: true } }],
                items: ['b'],
              },
            ],
          },
        ],
      },
    })
    type Field = (typeof json.fields)[number]
    expectTypeOf<Field['affects']>().toEqualTypeOf<Affect[] | undefined>()

    builder.defineForm({
      version: '1',
      fields: [
        {
          name: 'b',
          type: 'text',
          // @ts-expect-error -- "reveal" is no effect.
          affects: [{ effect: 'reveal', when: { field: 'a', empty: true } }],
        },
      ],
    })
  })
})
