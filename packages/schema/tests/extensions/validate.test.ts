import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import {
  createSchemaBuilder,
  defineFieldType,
  type ExtensionTarget,
  type FieldNode,
  type JsonForm,
  type ResolvedField,
  type SchemaExtension,
} from '@whatsaaaa/form-builder-schema'
import { form } from '../helpers'
import { hideWhen } from './hide-when'

const builder = createSchemaBuilder({ extensions: [hideWhen()] })

describe('creating a builder with extensions', () => {
  const extension = (props: v.ObjectEntries, layout?: v.ObjectEntries): SchemaExtension => ({
    name: 'x',
    fieldProps: v.object(props),
    ...(layout && { layoutProps: v.object(layout) }),
    check: () => new Map(),
  })

  it('runs a plain object that matches SchemaExtension', () => {
    const hideNick: SchemaExtension = {
      name: 'hideNick',
      fieldProps: v.object({ hideNick: v.optional(v.boolean()) }),
      check(ctx) {
        const target = ctx.targets.find((each) => each.json['hideNick'] === true)
        if (!target) return new Map()
        const anon = ctx.resolve('anonymous', target)
        if (anon === null || typeof anon === 'string') return new Map()
        return new Map([
          [
            target,
            {
              reads: [{ field: anon, at: [...target.definitionPath, 'hideNick'] }],
              evaluate: (read) => ({ hidden: read(0) === true, clear: false }),
            },
          ],
        ])
      },
    }
    const plain = createSchemaBuilder({ extensions: [hideNick] })
    const json = form(
      { name: 'anonymous', type: 'checkbox' },
      { name: 'nick', type: 'text', required: true, hideNick: true },
    )
    const schema = plain.build(json)
    expect(v.safeParse(schema, { anonymous: true, nick: '' }).success).toBe(true)
    expect(v.safeParse(schema, { anonymous: false, nick: '' }).success).toBe(false)
    const [, nick] = plain.getFieldTree(json)
    const state = plain.getVisibility(json).of({ anonymous: true, nick: '' })
    expect(state.isHidden(nick as FieldNode, [])).toBe(true)
  })

  it("rejects a key that is reserved, or a field type's prop", () => {
    expect(() => createSchemaBuilder({ extensions: [extension({ label: v.string() })] })).toThrow(
      new TypeError('Extension "x": fieldProps can\'t use the reserved key "label"'),
    )
    expect(() => createSchemaBuilder({ extensions: [extension({ options: v.string() })] })).toThrow(
      new TypeError(
        'Extension "x": fieldProps can\'t use "options", a prop of field type "select"',
      ),
    )
  })

  it("rejects a key of the layout's own on steps and sections", () => {
    expect(() =>
      createSchemaBuilder({ extensions: [extension({}, { items: v.string() })] }),
    ).toThrow(new TypeError('Extension "x": layoutProps can\'t use the layout\'s key "items"'))
  })

  it('rejects a key another extension uses', () => {
    expect(() => createSchemaBuilder({ extensions: [hideWhen('a'), hideWhen('b')] })).toThrow(
      new TypeError('Extension "b": fieldProps can\'t use "hideWhen", which extension "a" uses'),
    )
  })

  it("rejects a field type whose props use an extension's key", () => {
    const fieldTypes = {
      flag: defineFieldType({
        kind: 'boolean',
        props: v.object({ hideWhen: v.string() }),
        schema: () => v.boolean(),
      }),
    }
    expect(() => createSchemaBuilder({ fieldTypes, extensions: [hideWhen()] })).toThrow(
      'can\'t use "hideWhen", a prop of field type "flag"',
    )
  })
})

describe("an extension's keys", () => {
  const json: JsonForm = {
    ...form(
      { name: 'a', type: 'checkbox' },
      { name: 'b', type: 'text', hideWhen: { field: 'a' } },
      { type: 'paragraph', text: 'Hi', hideWhen: { field: 'a' } },
    ),
    layout: {
      steps: [
        { items: ['a'] },
        {
          hideWhen: { field: 'a' },
          items: [
            { type: 'section', hideWhen: { field: 'a' }, items: ['b', '*'] },
            { type: 'heading', text: 'Done', hideWhen: { field: 'a' } },
          ],
        },
      ],
    } as never,
  }

  it('are unknown keys without the extension', () => {
    expect(createSchemaBuilder().validate(json).issues).toEqual([
      {
        code: 'unknown_key',
        path: ['fields', 1, 'hideWhen'],
        message: 'Unknown key "hideWhen" on a "text" field',
      },
      {
        code: 'unknown_key',
        path: ['fields', 2, 'hideWhen'],
        message: 'Unknown key "hideWhen" on a "paragraph" field',
      },
      {
        code: 'unknown_key',
        path: ['layout', 'steps', 1, 'hideWhen'],
        message: 'Unknown key "hideWhen" on a step',
      },
      {
        code: 'unknown_key',
        path: ['layout', 'steps', 1, 'items', 0, 'hideWhen'],
        message: 'Unknown key "hideWhen" on a section',
      },
      {
        code: 'unknown_key',
        path: ['layout', 'steps', 1, 'items', 1, 'hideWhen'],
        message: 'Unknown key "hideWhen" on a "heading" field',
      },
    ])
  })

  it('go on fields, display elements, steps and sections with the extension', () => {
    expect(builder.validate(json)).toEqual({ success: true, issues: [] })
  })

  it("aren't keys of a row", () => {
    const withRow: JsonForm = {
      ...form({ name: 'a', type: 'checkbox' }),
      layout: { items: [{ type: 'row', hideWhen: { field: 'a' }, items: ['a'] }] } as never,
    }
    expect(builder.validate(withRow).issues).toEqual([
      {
        code: 'unknown_key',
        path: ['layout', 'items', 0, 'hideWhen'],
        message: 'Unknown key "hideWhen" on a row',
      },
    ])
  })

  it("are checked by the extension, which reports the paths it can't read", () => {
    const bad = form(
      { name: 'a', type: 'checkbox' },
      { name: 'b', type: 'text', hideWhen: { field: 'nope' } },
      { name: 'c', type: 'text', hideWhen: 'a' },
      {
        name: 'lines',
        type: 'array',
        fields: [{ name: 'x', type: 'text' }],
        hideWhen: { field: 'lines.*.x' },
      },
    )
    expect(builder.validate(bad).issues).toEqual([
      {
        code: 'unknown_field',
        path: ['fields', 1, 'hideWhen', 'field'],
        message: 'Unknown field "nope"',
      },
      {
        code: 'invalid_shape',
        path: ['fields', 2, 'hideWhen'],
        message: 'hideWhen is { field, equals?, clear? }',
      },
      {
        code: 'unknown_field',
        path: ['fields', 3, 'hideWhen', 'field'],
        message: '"lines.*.x" is read from each item of "lines", so "lines" must be too',
      },
    ])
  })
})

describe('resolving a path', () => {
  /** What `resolve` gives each target for each path, from an extension that only records it. */
  function resolved(json: JsonForm, paths: readonly string[]) {
    const results: Record<string, unknown> = {}
    const recorder: SchemaExtension = {
      name: 'recorder',
      fieldProps: v.object({ reads: v.optional(v.string()) }),
      layoutProps: v.object({ reads: v.optional(v.string()) }),
      check(ctx) {
        for (const target of ctx.targets.filter((each: ExtensionTarget) => each.json['reads'])) {
          for (const path of paths) {
            const found = ctx.resolve(path, target)
            results[`${target.definitionPath.join('.')} ${path}`] =
              found === null || typeof found === 'string' ? found : describe(found)
          }
        }
        return new Map()
      },
    }
    createSchemaBuilder({ extensions: [recorder] }).validate(json)
    return results
  }

  const describe = (field: ResolvedField) => ({
    path: field.field.dataPath.join('.'),
    kind: field.kind,
    item: field.item?.kind,
    accepts: (value: unknown) => v.is(field.schema, value),
  })

  it('gives the kind of a field, and of the items of an array', () => {
    const json = form(
      { name: 'size', type: 'select', options: [{ value: 1, label: 'S' }] },
      { name: 'tags', type: 'multiselect', options: [{ value: 'a', label: 'A' }] },
      { name: 'list', type: 'array', of: { type: 'number' } },
      { name: 'lines', type: 'array', fields: [{ name: 'x', type: 'text' }] },
      { name: 'files', type: 'file', multiple: true },
      { name: 'me', type: 'text', reads: 'x' },
    )
    const found = resolved(json, ['size', 'tags', 'list', 'lines', 'files']) as Record<
      string,
      ReturnType<typeof describe>
    >
    expect(found['fields.5 size']).toMatchObject({ kind: 'number', item: undefined })
    expect(found['fields.5 size']?.accepts(1)).toBe(true)
    expect(found['fields.5 size']?.accepts(2)).toBe(false)
    expect(found['fields.5 tags']).toMatchObject({ kind: 'array', item: 'string' })
    expect(found['fields.5 list']).toMatchObject({ kind: 'array', item: 'number' })
    expect(found['fields.5 lines']).toMatchObject({ kind: 'array', item: undefined })
    expect(found['fields.5 files']).toMatchObject({ kind: 'array', item: 'file' })
  })

  it("can't read the field of a list of single values, or a display element", () => {
    const json = form(
      { name: 'list', type: 'array', of: { type: 'number' } },
      { name: 'title', type: 'heading', text: 'T' },
      { name: 'me', type: 'text', reads: 'x' },
    )
    expect(resolved(json, ['list.*', 'title'])).toEqual({
      'fields.2 list.*': 'Unknown field "list.*"',
      'fields.2 title': 'Unknown field "title"',
    })
  })

  it("reads an item's fields only from inside the same item, and names what reads", () => {
    const json: JsonForm = {
      ...form(
        {
          name: 'lines',
          type: 'array',
          fields: [
            { name: 'x', type: 'text' },
            { type: 'paragraph', text: 'P', reads: 'x' },
          ],
        },
        { type: 'heading', text: 'H', reads: 'x' },
      ),
      layout: {
        steps: [
          {
            reads: 'x',
            items: [
              { field: 'lines', items: [{ type: 'section', reads: 'x', items: ['*'] }] },
              '*',
            ],
          },
        ],
      } as never,
    }
    expect(resolved(json, ['lines.*.x'])).toEqual({
      'fields.0.fields.1 lines.*.x': {
        path: 'lines.*.x',
        kind: 'string',
        item: undefined,
        accepts: expect.any(Function),
      },
      'fields.1 lines.*.x':
        '"lines.*.x" is read from each item of "lines", so the heading must be too',
      'layout.steps.0 lines.*.x':
        '"lines.*.x" is read from each item of "lines", so the step must be too',
      'layout.steps.0.items.0.items.0 lines.*.x': {
        path: 'lines.*.x',
        kind: 'string',
        item: undefined,
        accepts: expect.any(Function),
      },
    })
  })

  it('gives null for a field with issues, which are reported already', () => {
    const json = form(
      { name: 'a', type: 'text', rules: [{ rule: 'nope' }] },
      { name: 'me', type: 'text', reads: 'x' },
    )
    expect(resolved(json, ['a'])).toEqual({ 'fields.1 a': null })
  })
})

describe('a loop of conditions', () => {
  const issues = (json: JsonForm) => builder.validate(json).issues

  it('is reported where the first field in it reads the next', () => {
    const json = form(
      { name: 'a', type: 'text', hideWhen: { field: 'b' } },
      { name: 'b', type: 'text', hideWhen: { field: 'a' } },
    )
    expect(issues(json)).toEqual([
      {
        code: 'cycle',
        path: ['fields', 0, 'hideWhen', 'field'],
        message: 'Conditions depend on each other in a loop: "a" → "b" → "a"',
      },
    ])
  })

  it('takes in a field that reads itself', () => {
    expect(issues(form({ name: 'a', type: 'text', hideWhen: { field: 'a' } }))).toEqual([
      {
        code: 'cycle',
        path: ['fields', 0, 'hideWhen', 'field'],
        message: 'Conditions depend on each other in a loop: "a" → "a"',
      },
    ])
  })

  it('takes in a group that reads a field inside it', () => {
    const json = form({
      name: 'company',
      type: 'group',
      hideWhen: { field: 'company.name' },
      fields: [{ name: 'name', type: 'text' }],
    })
    expect(issues(json)).toEqual([
      {
        code: 'cycle',
        path: ['fields', 0, 'hideWhen', 'field'],
        message:
          'Conditions depend on each other in a loop: "company" → "company.name" → "company"',
      },
    ])
  })

  it('takes in a step or a section that reads a field placed in it', () => {
    const json: JsonForm = {
      ...form({ name: 'a', type: 'text' }, { name: 'b', type: 'text' }),
      layout: {
        steps: [
          { id: 'one', hideWhen: { field: 'a' }, items: ['a'] },
          { items: [{ type: 'section', hideWhen: { field: 'b' }, items: ['b'] }] },
        ],
      } as never,
    }
    expect(issues(json)).toEqual([
      {
        code: 'cycle',
        path: ['layout', 'steps', 0, 'hideWhen', 'field'],
        message: 'Conditions depend on each other in a loop: "a" → step "one" → "a"',
      },
      {
        code: 'cycle',
        path: ['layout', 'steps', 1, 'items', 0, 'hideWhen', 'field'],
        message:
          'Conditions depend on each other in a loop: "b" → the section at layout.steps[1].items[0] → "b"',
      },
    ])
  })

  it('is checked once for the fields of every item of a list', () => {
    const json = form({
      name: 'lines',
      type: 'array',
      fields: [
        { name: 'a', type: 'text', hideWhen: { field: 'lines.*.b' } },
        { name: 'b', type: 'text', hideWhen: { field: 'lines.*.a' } },
      ],
    })
    expect(issues(json).map((issue) => issue.message)).toEqual([
      'Conditions depend on each other in a loop: "lines.*.a" → "lines.*.b" → "lines.*.a"',
    ])
  })

  it("isn't made by fields that only read the same field", () => {
    const json = form(
      { name: 'a', type: 'text' },
      { name: 'b', type: 'text', hideWhen: { field: 'a' } },
      { name: 'c', type: 'text', hideWhen: { field: 'a' } },
      { name: 'd', type: 'text', hideWhen: { field: 'b' } },
    )
    expect(issues(json)).toEqual([])
  })
})
