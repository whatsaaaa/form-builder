import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import {
  createSchemaBuilder,
  defineFieldType,
  type JsonField,
  type JsonForm,
} from '@whatsaaaa/form-builder-schema'
import { fixtures } from '../fixtures'

// Child fields are checked by the builder, so the props accept anything for them.
const childField = v.custom<JsonField>(() => true)

const { getItemInput } = createSchemaBuilder()

describe('getItemInput', () => {
  it('gives an object of the defaults of the fields of an array of objects', () => {
    const lines: JsonField = {
      name: 'lines',
      type: 'array',
      fields: [
        { name: 'product', type: 'text' },
        { name: 'qty', type: 'number', default: 1 },
        { type: 'divider' },
        { name: 'address', type: 'group', fields: [{ name: 'city', type: 'text', default: 'NS' }] },
        { name: 'tags', type: 'array', of: { type: 'text' } },
      ],
    }

    expect(getItemInput(lines)).toEqual({ qty: 1, address: { city: 'NS' }, tags: [] })
  })

  it('gives an empty object for fields without defaults', () => {
    expect(getItemInput({ type: 'array', fields: [{ name: 'a', type: 'text' }] })).toEqual({})
  })

  it('gives the default of the field of a list of single values', () => {
    expect(getItemInput({ type: 'array', of: { type: 'text', default: 'new' } })).toBe('new')
    expect(getItemInput({ type: 'array', of: { type: 'number' } })).toBe(undefined)
  })

  it('gives the input of a group or an array that is the field of the items', () => {
    const people: JsonField = {
      type: 'array',
      of: { type: 'group', fields: [{ name: 'role', type: 'text', default: 'guest' }] },
    }
    const matrix: JsonField = { type: 'array', of: { type: 'array', of: { type: 'number' } } }

    expect(getItemInput(people)).toEqual({ role: 'guest' })
    expect(getItemInput(matrix)).toEqual([])
  })

  it("ignores the array's own default and name", () => {
    const tags = fixtures.array?.fields[0] as JsonField

    expect(tags.default).toEqual(['new'])
    expect(getItemInput(tags)).toBe(undefined)
    expect(getItemInput(fixtures.array?.fields[1] as JsonField)).toEqual({ quantity: 1 })
  })

  it('gives a new object each time, so items never share their input', () => {
    const lines: JsonField = { type: 'array', fields: [{ name: 'a', type: 'text', default: 'x' }] }

    expect(getItemInput(lines)).not.toBe(getItemInput(lines))
  })

  it("gives undefined for a field that isn't a container of kind array", () => {
    expect(getItemInput({ name: 'a', type: 'text', default: 'x' })).toBe(undefined)
    expect(
      getItemInput({ name: 'm', type: 'multiselect', options: [{ value: 1, label: 'One' }] }),
    ).toBe(undefined)
    expect(getItemInput({ name: 'g', type: 'group', fields: [] })).toBe(undefined)
    expect(getItemInput({ type: 'heading', text: 'Hi' })).toBe(undefined)
  })

  it('never throws, and leaves out the fields with issues', () => {
    const lines: JsonField = {
      type: 'array',
      fields: [
        { name: 'a', type: 'nope', default: 1 },
        { name: 'b', type: 'number', default: 'two' },
        { name: 'c', type: 'text', default: 'x' },
      ],
    }

    expect(getItemInput(lines)).toEqual({ b: 'two', c: 'x' })
    expect(getItemInput({ type: 'array', of: { type: 'nope', default: 1 } })).toBe(undefined)
    expect(getItemInput({ type: 'nope' })).toBe(undefined)
    expect(getItemInput(null as unknown as JsonField)).toBe(undefined)
  })

  it('reads your own container types, of a list of fields or of one field', () => {
    const rows = defineFieldType({
      kind: 'array',
      container: true,
      props: v.object({ columns: v.array(childField) }),
      schema: (field, ctx) => v.array(ctx.buildFields(field.columns, [...ctx.path, 'columns'])),
    })
    const list = defineFieldType({
      kind: 'array',
      container: true,
      props: v.object({ item: childField }),
      schema: (field, ctx) => v.array(ctx.buildField(field.item, [...ctx.path, 'item'])),
    })
    const builder = createSchemaBuilder({ fieldTypes: { rows, list } })
    const json: JsonForm = {
      version: '1',
      fields: [
        { name: 'r', type: 'rows', columns: [{ name: 'x', type: 'number', default: 0 }] },
        { name: 'l', type: 'list', item: { type: 'text', default: 'new' } },
      ],
    }
    const [r, l] = json.fields as JsonField[]

    expect(builder.getItemInput(r as JsonField)).toEqual({ x: 0 })
    expect(builder.getItemInput(l as JsonField)).toBe('new')
    // The default builder doesn't know these types.
    expect(getItemInput(r as JsonField)).toBe(undefined)
  })
})
