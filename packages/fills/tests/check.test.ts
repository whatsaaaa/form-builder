import { createSchemaBuilder, type JsonField } from '@whatsaaaa/form-builder-schema'
import { fills } from '@whatsaaaa/form-builder-fills'
import { describe, expect, it } from 'vitest'
import { builder, definitionIssues, form } from './helpers'

const fields: JsonField[] = [
  { name: 'name', type: 'text' },
  { name: 'age', type: 'number', rules: [{ rule: 'minValue', value: 18 }] },
  { name: 'agree', type: 'checkbox', required: true },
  { name: 'born', type: 'date' },
  {
    name: 'size',
    type: 'select',
    options: [
      { value: 's', label: 'S' },
      { value: 'm', label: 'M' },
    ],
  },
  {
    name: 'topics',
    type: 'multiselect',
    options: [
      { value: 1, label: 'One' },
      { value: 2, label: 'Two' },
    ],
  },
  { name: 'tags', type: 'array', of: { type: 'text' } },
  { name: 'lines', type: 'array', fields: [{ name: 'sku', type: 'text' }] },
  { name: 'photo', type: 'file' },
  { name: 'photos', type: 'file', multiple: true },
  { name: 'address', type: 'group', fields: [{ name: 'city', type: 'text' }] },
  { type: 'heading', name: 'title', text: 'Title' },
  { name: 'mail', type: 'email' },
]

/** The issues of `fills` on a field `x` of `type`, after the fields above. */
const issuesOn = (fill: unknown, field: Partial<JsonField> = {}) =>
  definitionIssues(
    form(...fields, { name: 'x', type: 'text', ...field, fills: fill } as JsonField),
  ).map((issue) => issue.replace('fields.13.fills', 'fills'))

/** The issues of `fills` on the text field `x`. */
const issuesOf = (fill: unknown) => issuesOn(fill)

describe('the shape of fills', () => {
  it('is an object', () => {
    for (const fill of ['profiles', ['name'], null, 1]) {
      expect(issuesOf(fill)).toEqual([
        'invalid_shape at fills: "fills" is an object: { "source", "fields" } or { "map" }',
      ])
    }
  })

  it('takes only its own keys', () => {
    expect(issuesOf({ map: { a: { name: 'Marko' } }, overwrites: 'always' })).toEqual([
      'unknown_key at fills.overwrites: Unknown key "overwrites" on fills',
    ])
    expect(issuesOf({ sources: 'profiles' })).toEqual([
      'unknown_key at fills.sources: Unknown key "sources" on fills',
    ])
  })

  it('has "source" or "map", and not both', () => {
    expect(issuesOf({ source: 'profiles', fields: ['name'], map: { a: {} } })).toEqual([
      'invalid_shape at fills: A fill has "source" or "map", not both',
      'invalid_shape at fills.fields: A fill with "map" sets the fields its values name, so it has no "fields"',
    ])
    expect(issuesOf({})).toEqual([
      `invalid_shape at fills: A fill needs "source", a source's name, or "map", the values for each value`,
    ])
    expect(issuesOf({ overwrite: 'always' })).toEqual([
      `invalid_shape at fills: A fill needs "source", a source's name, or "map", the values for each value`,
    ])
  })

  it('names a source by a string', () => {
    for (const source of ['', 5, null]) {
      expect(issuesOf({ source, fields: ['name'] })).toEqual([
        'invalid_shape at fills.source: "source" is the name of a source, like "profiles"',
      ])
    }
  })

  it('reports a source the extension has none of, only when it was given sources', () => {
    expect(issuesOf({ source: 'profile', fields: ['name'] })).toEqual([
      'unknown_source at fills.source: Unknown source "profile". The sources are "profiles", "cities"',
    ])
    const none = createSchemaBuilder({ extensions: [fills({ sources: {} })] })
    expect(
      definitionIssues(
        form({ name: 'x', type: 'text', fills: { source: 'profiles', fields: ['y'] } } as never, {
          name: 'y',
          type: 'text',
        }),
        none,
      ),
    ).toEqual([
      'unknown_source at fields.0.fills.source: Unknown source "profiles". fills() was given no sources',
    ])
    const server = createSchemaBuilder({ extensions: [fills()] })
    expect(
      definitionIssues(
        form({ name: 'x', type: 'text', fills: { source: 'anything', fields: ['y'] } } as never, {
          name: 'y',
          type: 'text',
        }),
        server,
      ),
    ).toEqual([])
  })

  it('needs "fields" with a source: a list of distinct dot paths', () => {
    expect(issuesOf({ source: 'profiles' })).toEqual([
      'invalid_shape at fills: A fill with "source" needs "fields": the fields it can set',
    ])
    for (const list of [[], 'name', { name: true }]) {
      expect(issuesOf({ source: 'profiles', fields: list })).toEqual([
        'invalid_shape at fills.fields: "fields" is a list of at least one dot path, like "address.city"',
      ])
    }
    expect(issuesOf({ source: 'profiles', fields: ['name', '', 3, 'name'] })).toEqual([
      'invalid_shape at fills.fields.1: A field is its dot path, like "address.city"',
      'invalid_shape at fills.fields.2: A field is its dot path, like "address.city"',
      'invalid_shape at fills.fields.3: "name" is in "fields" already',
    ])
  })

  it('has a map of objects, with values of the shape a field holds', () => {
    for (const map of [{}, [], 'a', null]) {
      expect(issuesOf({ map })).toEqual([
        `invalid_shape at fills.map: "map" has the values for each value of the field, like { "a": { "firstName": "Marko" } }`,
      ])
    }
    expect(issuesOf({ map: { a: 'Marko', b: ['Marko'] } })).toEqual([
      'invalid_shape at fills.map.a: The values for "a" are an object, by the dot path of each field',
      'invalid_shape at fills.map.b: The values for "b" are an object, by the dot path of each field',
    ])
    expect(issuesOf({ map: { a: { name: { first: 'Marko' }, tags: [['a']] } } })).toEqual([
      'invalid_shape at fills.map.a.name: A value is a string, a number, a boolean, null, or a list of the first three',
      'invalid_shape at fills.map.a.tags: A value is a string, a number, a boolean, null, or a list of the first three',
    ])
  })

  it('takes "unedited" or "always" for "overwrite"', () => {
    expect(issuesOf({ map: { a: { name: 'Marko' } }, overwrite: 'never' })).toEqual([
      'invalid_shape at fills.overwrite: "overwrite" is "unedited" or "always"',
    ])
    expect(issuesOf({ map: { a: { name: 'Marko' } }, overwrite: 'always' })).toEqual([])
    expect(issuesOf({ source: 'profiles', fields: ['name'], overwrite: 'unedited' })).toEqual([])
  })
})

describe('the field a fill is on', () => {
  it('has a value', () => {
    const json = form({ type: 'heading', text: 'Hi', fills: { map: { a: {} } } } as never)
    expect(definitionIssues(json)).toEqual([
      `kind_mismatch at fields.0.fills: A heading has no value, so it can't fill fields`,
    ])
    const inLayout = {
      version: '1',
      fields: [{ name: 'name', type: 'text' }],
      layout: {
        items: [{ type: 'divider', fills: { map: { a: { name: 'Marko' } } } }, 'name'],
      },
    }
    expect(definitionIssues(inLayout)).toEqual([
      `kind_mismatch at layout.items.0.fills: A divider has no value, so it can't fill fields`,
    ])
  })

  it('has one string, number, boolean or date value', () => {
    expect(
      issuesOn({ map: { a: {} } }, {
        type: 'multiselect',
        options: [{ value: 'a', label: 'A' }],
      } as never),
    ).toEqual([`kind_mismatch at fills: "fills" can't be used on array fields, like "x"`])
    expect(issuesOn({ map: { a: {} } }, { type: 'file' })).toEqual([
      `kind_mismatch at fills: "fills" can't be used on file fields, like "x"`,
    ])
    const group = form({
      name: 'address',
      type: 'group',
      fields: [{ name: 'city', type: 'text' }],
      fills: { map: { a: {} } },
    } as never)
    expect(definitionIssues(group)).toEqual([
      `kind_mismatch at fields.0.fills: "fills" can't be used on object fields, like "address"`,
    ])
  })

  it("isn't inside a list's items", () => {
    const json = form(
      {
        name: 'lines',
        type: 'array',
        fields: [{ name: 'kind', type: 'text', fills: { map: { a: { 'lines.*.sku': 'x' } } } }],
      } as never,
      {
        name: 'tags',
        type: 'array',
        of: { type: 'text', fills: { map: { a: {} } } },
      } as never,
    )
    expect(definitionIssues(json)).toEqual([
      `invalid_shape at fields.0.fields.0.fills: A field inside a list's items can't have "fills"`,
      `invalid_shape at fields.1.of.fills: A field inside a list's items can't have "fills"`,
    ])
  })

  it("isn't on steps or sections, which have no fills key", () => {
    const json = {
      version: '1',
      fields: [{ name: 'name', type: 'text' }],
      layout: { steps: [{ fills: { map: { a: {} } }, items: ['name'] }] },
    }
    expect(definitionIssues(json)).toEqual([
      'unknown_key at layout.steps.0.fills: Unknown key "fills" on a step',
    ])
  })

  it('adds no issue when the field has issues of its own', () => {
    const json = form({ name: 'name', type: 'text' }, {
      name: 'name',
      type: 'text',
      fills: { map: { a: { name: 'Marko' } } },
    } as never)
    expect(definitionIssues(json).map((issue) => issue.split(':')[0])).toEqual([
      'duplicate_name at fields.1.name',
    ])
  })
})

describe('the fields a fill sets', () => {
  it('are fields with a value, at any depth outside lists', () => {
    expect(
      issuesOf({ source: 'profiles', fields: ['name', 'address.city', 'topics', 'size', 'born'] }),
    ).toEqual([])
  })

  it('reports a path that names no field with a value', () => {
    expect(
      issuesOf({ source: 'profiles', fields: ['nme', 'address.town', 'title', 'name.first'] }),
    ).toEqual([
      'unknown_field at fills.fields.0: Unknown field "nme"',
      'unknown_field at fills.fields.1: Unknown field "address.town"',
      'unknown_field at fills.fields.2: Unknown field "title"',
      'unknown_field at fills.fields.3: Unknown field "name.first"',
    ])
  })

  it("reports a path into a list's items", () => {
    expect(
      issuesOf({
        source: 'profiles',
        fields: ['lines.*.sku', 'lines.0.sku', 'lines.sku', 'tags.*'],
      }),
    ).toEqual([
      `unknown_field at fills.fields.0: A fill can't set the fields of a list's items, like "lines.*.sku"`,
      `unknown_field at fills.fields.1: A fill can't set the fields of a list's items, like "lines.0.sku"`,
      `unknown_field at fills.fields.2: A fill can't set the fields of a list's items, like "lines.sku"`,
      `unknown_field at fills.fields.3: A fill can't set the fields of a list's items, like "tags.*"`,
    ])
  })

  it('reports groups, lists and files', () => {
    expect(
      issuesOf({ source: 'profiles', fields: ['address', 'lines', 'tags', 'photo', 'photos'] }),
    ).toEqual([
      'kind_mismatch at fills.fields.0: A fill sets fields with a value, not the group "address". Name its fields, like "address.city"',
      'kind_mismatch at fills.fields.1: A fill sets fields with a value, not the list "lines"',
      'kind_mismatch at fills.fields.2: A fill sets fields with a value, not the list "tags"',
      `kind_mismatch at fills.fields.3: A fill can't set a file, like "photo"`,
      `kind_mismatch at fills.fields.4: A fill can't set a file, like "photos"`,
    ])
  })

  it('names a field of a group to set instead, when it has one', () => {
    const json = form(
      { name: 'x', type: 'text', fills: { source: 'profiles', fields: ['a', 'b'] } } as never,
      {
        name: 'a',
        type: 'group',
        fields: [
          { type: 'heading', text: 'Address' },
          { name: 'city', type: 'text' },
        ],
      } as never,
      { name: 'b', type: 'group', fields: [{ type: 'paragraph', text: 'Nothing yet' }] } as never,
    )
    expect(definitionIssues(json)).toEqual([
      'kind_mismatch at fields.0.fills.fields.0: A fill sets fields with a value, not the group "a". Name its fields, like "a.city"',
      'kind_mismatch at fields.0.fills.fields.1: A fill sets fields with a value, not the group "b". Name its fields',
    ])
  })

  it('reports a path of a map at each entry that names it', () => {
    expect(
      issuesOf({ map: { a: { nme: 'Marko' }, b: { nme: 'Jelena', name: 'Jelena' } } }),
    ).toEqual([
      'unknown_field at fills.map.a.nme: Unknown field "nme"',
      'unknown_field at fills.map.b.nme: Unknown field "nme"',
    ])
  })

  it('adds no issue for a field, or a group around it, with issues of its own', () => {
    const json = form(
      { name: 'a', type: 'text', fills: { source: 'profiles', fields: ['b', 'c.city'] } } as never,
      { name: 'b', type: 'text', rules: [{ rule: 'nope' }] } as never,
      { name: 'c', type: 'group', fields: [{ name: 'city', type: 'text' }], size: 2 } as never,
    )
    expect(definitionIssues(json).map((issue) => issue.split(':')[0])).toEqual([
      'unknown_rule at fields.1.rules.0.rule',
      'unknown_key at fields.2.size',
    ])
  })
})

describe('the values of a map', () => {
  it('are values each field can hold, rules included, like a default', () => {
    expect(
      issuesOf({
        map: {
          a: {
            name: 'Marko',
            age: 30,
            agree: true,
            born: '1990-05-01',
            size: 'm',
            topics: [1, 2],
            mail: 'marko@example.com',
            'address.city': 'Beograd',
          },
        },
      }),
    ).toEqual([])
    expect(
      issuesOf({
        map: {
          a: {
            name: 5,
            age: 'x',
            size: 'xl',
            topics: [3],
            mail: 'marko',
            agree: false,
            'address.city': true,
          },
          b: { age: 12 },
        },
      }),
    ).toEqual([
      `invalid_value at fills.map.a.name: "name" can't hold 5: Invalid type: Expected string but received 5`,
      `invalid_value at fills.map.a.age: "age" can't hold "x": Invalid type: Expected number but received "x"`,
      `invalid_value at fills.map.a.size: "size" can't hold "xl": Invalid type: Expected ("s" | "m") but received "xl"`,
      `invalid_value at fills.map.a.topics: "topics" can't hold [3]: Invalid type: Expected (1 | 2) but received 3`,
      `invalid_value at fills.map.a.mail: "mail" can't hold "marko": Invalid email: Received "marko"`,
      `invalid_value at fills.map.a.agree: "agree" can't hold false: Required`,
      `invalid_value at fills.map.a.address.city: "address.city" can't hold true: Invalid type: Expected string but received true`,
      `invalid_value at fills.map.b.age: "age" can't hold 12: Invalid value: Expected >=18 but received 12`,
    ])
  })

  it('may be blank, even for a required field', () => {
    expect(issuesOf({ map: { a: { name: null, age: '', topics: [], agree: null } } })).toEqual([])
  })
})

describe('the keys of a map', () => {
  /** The issues of a map with `keys` on a field of `type`. */
  const keysOn = (field: Partial<JsonField>, ...keys: string[]) =>
    issuesOn({ map: Object.fromEntries(keys.map((key) => [key, { name: 'Marko' }])) }, field)

  it('are values the field can hold', () => {
    expect(
      keysOn({ type: 'select', options: [{ value: 'a', label: 'A' }] } as never, 'a', 'b'),
    ).toEqual([
      `invalid_value at fills.map.b: "x" can't hold "b": Invalid type: Expected "a" but received "b"`,
    ])
    expect(keysOn({ type: 'date' }, '2026-01-31', '2026-13-01')).toEqual([
      `invalid_value at fills.map.2026-13-01: "x" can't hold "2026-13-01": Invalid date: Received "2026-13-01"`,
    ])
  })

  it('are never empty', () => {
    expect(keysOn({}, '')).toEqual([
      'invalid_value at fills.map.: An empty key is no value of "x", so it never fills',
    ])
  })

  it('are numbers as JSON writes them, for a number', () => {
    expect(keysOn({ type: 'number' }, '1', '-2.5', '01', '1e3', 'one')).toEqual([
      'invalid_value at fills.map.01: "x" holds numbers, so a key is one as JSON writes it, like "1", not "01"',
      'invalid_value at fills.map.1e3: "x" holds numbers, so a key is one as JSON writes it, like "1", not "1e3"',
      'invalid_value at fills.map.one: "x" holds numbers, so a key is one as JSON writes it, like "1", not "one"',
    ])
    expect(
      keysOn(
        {
          type: 'select',
          options: [
            { value: 1, label: 'One' },
            { value: 2, label: 'Two' },
          ],
        } as never,
        '1',
        '3',
      ),
    ).toEqual([
      `invalid_value at fills.map.3: "x" can't hold "3": Invalid type: Expected (1 | 2) but received 3`,
    ])
  })

  it('are "true" or "false" for a boolean', () => {
    expect(keysOn({ type: 'checkbox' }, 'true', 'false', 'yes')).toEqual([
      'invalid_value at fills.map.yes: "x" is true or false, so a key is "true" or "false", not "yes"',
    ])
  })
})

describe('loops', () => {
  it('reports a fill that sets its own field', () => {
    expect(issuesOf({ source: 'profiles', fields: ['name', 'x'] })).toEqual([
      'cycle at fills.fields.1: "x" fills itself',
    ])
  })

  it('reports fills that set each other', () => {
    const json = form(
      { name: 'a', type: 'text', fills: { map: { x: { b: 'y' } } } } as never,
      { name: 'b', type: 'text', fills: { source: 'profiles', fields: ['a'] } } as never,
    )
    expect(definitionIssues(json)).toEqual([
      'cycle at fields.1.fills.fields.0: Fills set each other in a loop: "a" → "b" → "a"',
    ])
  })

  it('allows chains, and fills that set the same field', () => {
    const json = form(
      { name: 'a', type: 'text', fills: { map: { x: { b: 'y', c: 'z' } } } } as never,
      { name: 'b', type: 'text', fills: { source: 'profiles', fields: ['c'] } } as never,
      { name: 'c', type: 'text' },
    )
    expect(definitionIssues(json)).toEqual([])
  })
})

describe('the builder', () => {
  it('reads fills as an unknown key without the extension', () => {
    const json = form({ name: 'x', type: 'text', fills: { map: { a: {} } } } as never)
    expect(definitionIssues(json, createSchemaBuilder())).toEqual([
      'unknown_key at fields.0.fills: Unknown key "fills" on a "text" field',
    ])
  })

  it('throws a TypeError for a source that is no function', () => {
    expect(() => fills({ sources: { profiles: 'https://example.com' as never } })).toThrow(
      new TypeError(
        `fills(): the source "profiles" is a function, like (value, { signal }) => ({ firstName: 'Marko' })`,
      ),
    )
  })

  it('throws a DefinitionError with every issue from build() and getFills()', () => {
    const json = form({
      name: 'x',
      type: 'text',
      fills: { source: 'nope', fields: ['y'] },
    } as never)
    const message = [
      'Invalid form definition:',
      '   fields[0].fills.source: Unknown source "nope". The sources are "profiles", "cities"',
      '   fields[0].fills.fields[0]: Unknown field "y"',
    ].join('\n')
    expect(() => builder.build(json)).toThrow(message)
    expect(() => builder.getFills(json)).toThrow(message)
  })
})
