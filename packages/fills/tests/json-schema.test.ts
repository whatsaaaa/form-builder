import { readFileSync } from 'node:fs'
import { Ajv } from 'ajv'
import { createSchemaBuilder } from '@whatsaaaa/form-builder-schema'
import { toJsonSchema } from '@whatsaaaa/form-builder-schema/json-schema'
import { type Fill, fills } from '@whatsaaaa/form-builder-fills'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { builder, fixtures, form, sources } from './helpers'

const committed = JSON.parse(
  readFileSync(new URL('../definition.schema.json', import.meta.url), 'utf8'),
) as Record<string, unknown>
const validate = new Ajv({ allErrors: true, strict: false }).compile(committed)

describe('definition.schema.json', () => {
  it("is the schema of a builder with fills(): run `pnpm docs:gen` when it isn't", () => {
    const { description: _, ...made } = toJsonSchema(createSchemaBuilder({ extensions: [fills()] }))
    const { description: __, $id, ...file } = committed
    expect($id).toBe(
      'https://whatsaaaa.github.io/form-builder/schema/v1/fills/definition.schema.json',
    )
    expect(file).toEqual(made)
  })

  it('is the copy the docs site hosts', () => {
    const hosted = readFileSync(
      new URL('../../../apps/docs/public/schema/v1/fills/definition.schema.json', import.meta.url),
      'utf8',
    )
    expect(JSON.parse(hosted)).toEqual(committed)
  })

  it.each(Object.entries(fixtures))('takes the %s fixture', (_, json) => {
    expect(validate(json), JSON.stringify(validate.errors)).toBe(true)
  })

  it('rejects fills of the wrong shape, as validate() does', () => {
    const withFills = (fill: unknown) =>
      form({ name: 'a', type: 'text', fills: fill } as never, { name: 'b', type: 'text' })
    for (const fill of [
      'profiles',
      {},
      { source: 'profiles' },
      { source: '', fields: ['b'] },
      { source: 'profiles', fields: [] },
      { source: 'profiles', fields: [''] },
      { source: 'profiles', fields: ['b'], map: { x: { b: 'y' } } },
      { map: {} },
      { map: { x: 'y' } },
      { map: { '': { b: 'y' } } },
      { map: { x: { '': 'y' } } },
      { map: { x: { b: { first: 'y' } } } },
      { map: { x: { b: 'y' } }, fields: ['b'] },
      { map: { x: { b: 'y' } }, overwrite: 'never' },
      { map: { x: { b: 'y' } }, when: 'always' },
    ]) {
      expect(validate(withFills(fill)), JSON.stringify(fill)).toBe(false)
      expect(builder.validate(withFills(fill)).success, JSON.stringify(fill)).toBe(false)
    }
  })

  it('names the sources a builder was given, in the schema made for it', () => {
    const made = toJsonSchema(builder)
    const definitions = made['definitions'] as Record<string, { anyOf: { properties: object }[] }>
    expect(definitions['fills.fill']?.anyOf[0]?.properties).toMatchObject({
      source: { enum: ['profiles', 'cities'] },
    })
  })
})

describe('defineForm', () => {
  it('types fills on fields', () => {
    const json = createSchemaBuilder({ extensions: [fills()] }).defineForm({
      version: '1',
      fields: [
        {
          name: 'profile',
          type: 'select',
          options: [{ value: 'a', label: 'Profile A' }],
          fills: { map: { a: { firstName: 'Marko', tags: ['x'], age: null } } },
        },
        { name: 'zip', type: 'text', fills: { source: 'cities', fields: ['city'] } },
        { name: 'firstName', type: 'text' },
        { name: 'city', type: 'text' },
      ],
    })
    type Field = (typeof json.fields)[number]
    expectTypeOf<Field['fills']>().toEqualTypeOf<Fill | undefined>()

    createSchemaBuilder({ extensions: [fills()] }).defineForm({
      version: '1',
      fields: [
        {
          name: 'zip',
          type: 'text',
          // @ts-expect-error -- "never" is no overwrite.
          fills: { source: 'cities', fields: ['city'], overwrite: 'never' },
        },
      ],
    })
  })

  it('types the source as one of the names it was given', () => {
    const json = builder.defineForm({
      version: '1',
      fields: [
        { name: 'zip', type: 'text', fills: { source: 'cities', fields: ['city'] } },
        { name: 'city', type: 'text' },
      ],
    })
    type Field = (typeof json.fields)[number]
    expectTypeOf<Field['fills']>().toEqualTypeOf<Fill<keyof typeof sources> | undefined>()

    builder.defineForm({
      version: '1',
      fields: [
        // @ts-expect-error -- "towns" is no source of this builder.
        { name: 'zip', type: 'text', fills: { source: 'towns', fields: ['city'] } },
      ],
    })
  })
})
