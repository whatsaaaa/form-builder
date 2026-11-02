import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import {
  createBuildContext,
  createSchemaBuilder,
  DefinitionError,
  defineFieldType,
  type JsonField,
} from '@whatsaaaa/form-builder-schema'
import { form, messages } from '../helpers'

// Child fields are checked by the builder, so the props accept anything for them.
const childField = v.custom<JsonField>(() => true)

// Consumer containers, built the way the built-in group and array types are.
const section = defineFieldType({
  kind: 'object',
  container: true,
  props: v.object({ fields: v.array(childField) }),
  schema: (field, ctx) => ctx.buildFields(field.fields, [...ctx.path, 'fields']),
})

const list = defineFieldType({
  kind: 'array',
  container: true,
  props: v.object({ of: childField }),
  schema: (field, ctx) => v.array(ctx.buildField(field.of, [...ctx.path, 'of'])),
})

const { build, validate } = createSchemaBuilder({ fieldTypes: { section, list } })

const issues = (...fields: Parameters<typeof form>) =>
  validate(form(...fields)).issues.map(({ code, path }) => ({ code, path }))

describe('nested fields', () => {
  describe('a container of fields', () => {
    const schema = build(
      form({
        name: 'person',
        type: 'section',
        fields: [
          { type: 'heading', text: 'About you' },
          { name: 'first', type: 'text', required: true },
          { name: 'last', type: 'text' },
        ],
      }),
    )

    it('nests the values of its fields', () => {
      expect(v.parse(schema, { person: { first: 'Ana', last: '' } })).toEqual({
        person: { first: 'Ana', last: undefined },
      })
    })

    it('reports value issues at the nested path', () => {
      const result = v.safeParse(schema, { person: { first: '' } })

      expect(result.issues?.map((issue) => v.getDotPath(issue))).toEqual(['person.first'])
    })

    it('checks its fields when the value is missing', () => {
      const paths = (input: unknown) =>
        v.safeParse(schema, input).issues?.map((issue) => v.getDotPath(issue))

      expect(paths({})).toEqual(['person.first'])
      expect(paths({ person: undefined })).toEqual(['person.first'])
    })

    it('reports definition issues at their full path', () => {
      expect(
        issues({
          name: 'person',
          type: 'section',
          fields: [
            { name: 'first', type: 'text' },
            { name: 'last', type: 'text', rules: [{ rule: 'nope' }] },
          ],
        }),
      ).toEqual([{ code: 'unknown_rule', path: ['fields', 0, 'fields', 1, 'rules', 0, 'rule'] }])
    })

    it('reports the same issues from build()', () => {
      const json = form({ name: 'p', type: 'section', fields: [{ name: 'a', type: 'nope' }] })

      expect(() => build(json)).toThrow(DefinitionError)
      expect(() => build(json)).toThrow('fields[0].fields[0].type')
    })

    it('checks names per level', () => {
      expect(
        issues(
          { name: 'a', type: 'text' },
          {
            name: 'p',
            type: 'section',
            fields: [
              { name: 'a', type: 'text' },
              { name: 'a', type: 'text' },
            ],
          },
        ),
      ).toEqual([{ code: 'duplicate_name', path: ['fields', 1, 'fields', 1, 'name'] }])
    })

    it("can't be required or have a default", () => {
      expect(
        issues({ name: 'p', type: 'section', fields: [], required: true, default: {} }),
      ).toEqual([
        { code: 'invalid_shape', path: ['fields', 0, 'required'] },
        { code: 'invalid_shape', path: ['fields', 0, 'default'] },
      ])
    })
  })

  describe('a container of items', () => {
    it("builds each item from a field that doesn't need a name", () => {
      const schema = build(
        form({ name: 'tags', type: 'list', of: { type: 'text', rules: [{ rule: 'trim' }] } }),
      )

      expect(v.parse(schema, { tags: [' a ', 'b'] })).toEqual({ tags: ['a', 'b'] })
    })

    it('reads a missing value as an empty list and still runs its rules', () => {
      const plain = build(form({ name: 'tags', type: 'list', of: { type: 'text' } }))
      const schema = build(
        form({
          name: 'tags',
          type: 'list',
          of: { type: 'text' },
          rules: [{ rule: 'minLength', value: 1, message: 'Add a tag' }],
        }),
      )

      expect(v.parse(plain, {})).toEqual({ tags: [] })
      expect(messages(schema, {})).toEqual(['Add a tag'])
      expect(messages(schema, { tags: [] })).toEqual(['Add a tag'])
    })

    it('reports only the required message for an empty required list', () => {
      const schema = build(
        form({
          name: 'tags',
          type: 'list',
          of: { type: 'text' },
          required: true,
          rules: [{ rule: 'minLength', value: 2, message: 'Add two tags' }],
        }),
      )

      expect(messages(schema, { tags: [] })).toEqual(['Required'])
      expect(messages(schema, { tags: ['a'] })).toEqual(['Add two tags'])
    })

    it('needs an item field with a value', () => {
      expect(issues({ name: 'tags', type: 'list', of: { type: 'heading', text: 'x' } })).toEqual([
        { code: 'invalid_shape', path: ['fields', 0, 'of', 'type'] },
      ])
    })
  })

  it("throws a TypeError for a container whose kind isn't object or array", () => {
    const odd = defineFieldType({ kind: 'string', container: true, schema: () => v.string() })

    expect(() => createSchemaBuilder({ fieldTypes: { odd } })).toThrow(TypeError)
  })

  describe('createBuildContext', () => {
    const field = {
      name: 'person',
      type: 'section',
      fields: [{ name: 'first', type: 'text', required: true }],
    }

    it('lets a field type be tested on its own', () => {
      const ctx = createBuildContext({ path: ['fields', 0] })
      const schema = section.schema?.(field, ctx) as v.GenericSchema

      expect(ctx.path).toEqual(['fields', 0])
      expect(messages(schema, { first: '' })).toEqual(['Required'])
      expect(v.parse(schema, { first: 'Ana' })).toEqual({ first: 'Ana' })
    })

    it('throws for child fields with issues', () => {
      const bad = { ...field, fields: [{ name: 'first', type: 'nope' }] }

      expect(() => section.schema?.(bad, createBuildContext())).toThrow(DefinitionError)
    })
  })
})
