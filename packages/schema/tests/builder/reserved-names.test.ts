import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import {
  createSchemaBuilder,
  defineFieldType,
  type JsonField,
  type JsonForm,
  RESERVED_FIELD_KEYS,
  RESERVED_LAYOUT_TYPES,
  type SchemaExtension,
} from '@whatsaaaa/form-builder-schema'
import { form } from '../helpers'

// The names kept for later versions. 1.x minors can give them a meaning, so they are frozen.
const futureFieldKeys = ['id', 'disabled', 'readonly', 'hidden', 'help', 'meta']
const futureLayoutTypes = ['tabs', 'tab', 'columns', 'column', 'fieldset']

const display = defineFieldType({ kind: 'none', props: v.object({ text: v.string() }) })

const extension = (props: v.ObjectEntries): SchemaExtension => ({
  name: 'x',
  fieldProps: v.object(props),
  check: () => new Map(),
})

describe('the reserved names', () => {
  it('keep the names for later versions', () => {
    expect(RESERVED_FIELD_KEYS).toEqual(expect.arrayContaining(futureFieldKeys))
    expect(RESERVED_LAYOUT_TYPES).toEqual(['section', 'row', 'slot', ...futureLayoutTypes])
  })

  it.each(futureFieldKeys)("can't be a field type's prop: %s", (key) => {
    const type = defineFieldType({
      kind: 'string',
      props: v.object({ [key]: v.optional(v.string()) }),
      schema: () => v.string(),
    })

    expect(() => createSchemaBuilder({ fieldTypes: { x: type } })).toThrow(
      new TypeError(`Field type "x": props can't use the reserved key "${key}"`),
    )
  })

  it.each(futureFieldKeys)("can't be an extension's key: %s", (key) => {
    expect(() => createSchemaBuilder({ extensions: [extension({ [key]: v.string() })] })).toThrow(
      new TypeError(`Extension "x": fieldProps can't use the reserved key "${key}"`),
    )
  })

  it.each([...RESERVED_LAYOUT_TYPES])("can't be the type of a display element: %s", (name) => {
    expect(() => createSchemaBuilder({ fieldTypes: { [name]: display } })).toThrow(
      new TypeError(
        `Field type "${name}": a display element can't use the layout node type "${name}"`,
      ),
    )
  })

  it('can be the type of a field with a value, which is never written in a layout by its type', () => {
    const container = defineFieldType({
      kind: 'object',
      container: true,
      props: v.object({ fields: v.array(v.custom<JsonField>(() => true)) }),
      schema: (field, ctx) => ctx.buildFields(field.fields, [...ctx.path, 'fields']),
    })
    const builder = createSchemaBuilder({ fieldTypes: { section: container, fieldset: container } })

    expect(
      builder.validate(
        form({ name: 'a', type: 'fieldset', fields: [{ name: 'b', type: 'text' }] }),
      ),
    ).toEqual({ success: true, issues: [] })
  })

  it.each(futureFieldKeys)('reports the key %s on a field as reserved', (key) => {
    const { issues } = createSchemaBuilder().validate(form({ name: 'a', type: 'text', [key]: 'x' }))

    expect(issues).toEqual([
      {
        code: 'unknown_key',
        path: ['fields', 0, key],
        message: `Key "${key}" is reserved for a later version`,
      },
    ])
  })

  it.each(futureLayoutTypes)('reports a layout node of type %s as reserved', (type) => {
    const json = {
      version: '1',
      fields: [{ name: 'a', type: 'text' }],
      layout: { items: [{ type, items: ['a'] }, '*'] },
    } as JsonForm

    expect(createSchemaBuilder().validate(json).issues).toEqual([
      {
        code: 'unknown_type',
        path: ['layout', 'items', 0, 'type'],
        message: `Layout node type "${type}" is reserved for a later version`,
      },
    ])
  })
})
