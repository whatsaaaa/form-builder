import * as v from 'valibot'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  createSchemaBuilder,
  type JsonFormSchema,
  type TypedJsonFormSchema,
} from '@whatsaaaa/form-builder-schema'
import { form } from '../helpers'

// The type errors are tests too: `pnpm type-check` fails when a @ts-expect-error line compiles.

const { build } = createSchemaBuilder()

const order = form(
  { name: 'name', type: 'text', required: true, rules: [{ rule: 'trim' }] },
  { name: 'address', type: 'group', fields: [{ name: 'city', type: 'text' }] },
  { name: 'qty', type: 'number' },
)

// An interface, which Formisch's own constraint wouldn't take as it is.
interface OrderInput {
  name: string
  address: { city?: string }
  qty?: number
}

describe('build with your types', () => {
  it('types the input and output of the schema', () => {
    const schema = build<OrderInput>(order)

    expectTypeOf(schema).toEqualTypeOf<TypedJsonFormSchema<OrderInput>>()
    expectTypeOf<v.InferInput<typeof schema>>().toEqualTypeOf<{
      name: string
      address: { city?: string }
      qty?: number
    }>()
    // Formisch takes a schema whose input and output are records.
    expectTypeOf<v.InferOutput<typeof schema>>().toExtend<Record<string, unknown>>()
  })

  it('types the output separately when it differs from the input', () => {
    interface Output {
      name: string
      total: number
    }
    const schema = build<OrderInput, Output>(order)

    expectTypeOf<v.InferOutput<typeof schema>>().toEqualTypeOf<{ name: string; total: number }>()
  })

  it('returns the same schema as an untyped build', () => {
    const input = { name: '  Ana ', address: { city: 'Novi Sad' }, qty: 2 }
    const output = v.parse(build<OrderInput>(order), input)

    expect(output).toEqual(v.parse(build(order), input))
    expect(output.name).toBe('Ana')
    // @ts-expect-error a key that isn't in the type
    expect(output.adress).toBe(undefined)
  })

  it('stays untyped without your types', () => {
    const schema = build(order)

    expectTypeOf(schema).toEqualTypeOf<JsonFormSchema>()
    expectTypeOf<v.InferOutput<typeof schema>['anything']>().toBeUnknown()
  })
})
