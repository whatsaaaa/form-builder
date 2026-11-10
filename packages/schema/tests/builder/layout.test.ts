import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import {
  createSchemaBuilder,
  DefinitionError,
  defineFieldType,
  type JsonField,
  type JsonForm,
  type JsonLayout,
  type LayoutField,
} from '@whatsaaaa/form-builder-schema'
import { layoutFixtures } from '../fixtures'
import { outline } from '../helpers'

// A consumer container, so a layout reaches into any container's fields.
const panel = defineFieldType({
  kind: 'object',
  container: true,
  props: v.object({ fields: v.array(v.custom<JsonField>(() => true)) }),
  schema: (field, ctx) => ctx.buildFields(field.fields, [...ctx.path, 'fields']),
})

const builder = createSchemaBuilder({ fieldTypes: { panel } })
const { getLayout, validate } = builder

const fields: JsonField[] = [
  { type: 'heading', text: 'Sign up' },
  { name: 'name', type: 'text', required: true },
  { name: 'email', type: 'email', required: true },
  {
    name: 'address',
    type: 'group',
    fields: [
      { name: 'street', type: 'text' },
      { name: 'city', type: 'text' },
      { name: 'zip', type: 'text' },
    ],
  },
  { name: 'tags', type: 'array', of: { type: 'text' } },
  {
    name: 'lines',
    type: 'array',
    fields: [
      { name: 'product', type: 'text', required: true },
      { name: 'qty', type: 'number' },
    ],
  },
  { name: 'billing', type: 'panel', fields: [{ name: 'vat', type: 'text' }] },
]

const withLayout = (layout: unknown): JsonForm => ({ version: '1', fields, layout }) as JsonForm
const pageOf = (...items: unknown[]) => withLayout({ items })

/** The outline of the layout's only step. */
const page = (...items: unknown[]) => {
  const [step, ...more] = getLayout(pageOf(...items)).steps
  expect(more).toEqual([])
  return outline(step?.children ?? [])
}

const codesAndPaths = (layout: unknown) =>
  validate(withLayout(layout)).issues.map(({ code, path }) => ({ code, path }))

const at = (...path: (string | number)[]) => ['layout', ...path]

describe('getLayout', () => {
  it('gives one step with every field in the order of the definition without a layout', () => {
    const layout = getLayout({ version: '1', fields })

    expect(layout.ui).toBeUndefined()
    expect(layout.steps).toHaveLength(1)
    expect(layout.steps[0]?.step).toEqual({ items: ['*'] })
    expect(outline(layout.steps[0]?.children ?? [])).toEqual([
      'heading',
      'name',
      'email',
      'address',
      '  address.street',
      '  address.city',
      '  address.zip',
      'tags',
      '  text',
      'lines',
      '  lines.*.product',
      '  lines.*.qty',
      'billing',
      '  billing.vat',
    ])
  })

  it('gives each node the FieldNode of getFieldTree', () => {
    const [heading, name] = getLayout({ version: '1', fields }).steps[0]?.children ?? []
    const [headingNode, nameNode] = builder.getFieldTree({ version: '1', fields })

    expect((heading as LayoutField).node).toEqual(headingNode)
    expect((name as LayoutField).node).toEqual(nameNode)
  })

  it('places the fields in the order of the layout, and "*" places the rest', () => {
    expect(page('email', '*', 'name')).toEqual([
      'email',
      'heading',
      'address',
      '  address.street',
      '  address.city',
      '  address.zip',
      'tags',
      '  text',
      'lines',
      '  lines.*.product',
      '  lines.*.qty',
      'billing',
      '  billing.vat',
      'name',
    ])
  })

  it('places a field of a group on its own, and "*" brings the group with the rest of it', () => {
    expect(page('address.city', 'billing.vat', '*')).toEqual([
      'address.city',
      'billing.vat',
      'heading',
      'name',
      'email',
      'address',
      '  address.street',
      '  address.zip',
      'tags',
      '  text',
      'lines',
      '  lines.*.product',
      '  lines.*.qty',
    ])
  })

  it('leaves a group out of "*" when every field of it is placed elsewhere', () => {
    expect(page('address.street', 'address.city', 'address.zip', '*')).not.toContain('address')
  })

  it('splits the fields of a group across steps, and the value still nests them', () => {
    const json = withLayout({
      steps: [{ items: ['address.city', 'name'] }, { items: ['address.zip', '*'] }],
    })
    const [one, two] = getLayout(json).steps

    expect(outline(one?.children ?? [])).toEqual(['address.city', 'name'])
    expect(outline(two?.children ?? [])).toContain('  address.street')
    expect(
      v.parse(builder.build(json), { name: 'A', email: 'a@b.cd', address: { city: 'X' } }),
    ).toMatchObject({ address: { city: 'X' } })
  })

  describe('rows', () => {
    it('gives each cell its span, and 12 to anything outside a row', () => {
      expect(
        page(
          {
            type: 'row',
            items: [
              { field: 'name', span: 8 },
              { field: 'email', span: 4 },
            ],
          },
          '*',
        ).slice(0, 4),
      ).toEqual(['row', '  name:8', '  email:4', 'heading'])
    })

    it('shares the columns the spans leave equally between the cells without one', () => {
      expect(page({ type: 'row', items: ['name', 'email', 'tags'] }, '*').slice(0, 5)).toEqual([
        'row',
        '  name:4',
        '  email:4',
        '  tags:4',
        '    text',
      ])
      expect(
        page({ type: 'row', items: [{ field: 'name', span: 6 }, 'email', 'tags'] }, '*').slice(
          0,
          4,
        ),
      ).toEqual(['row', '  name:6', '  email:3', '  tags:3'])
    })

    it('leaves the rest of a row empty when the spans add up to less than 12', () => {
      expect(page({ type: 'row', items: [{ field: 'name', span: 5 }] }, '*').slice(0, 2)).toEqual([
        'row',
        '  name:5',
      ])
    })

    it('takes any item as a cell, a row in a row too', () => {
      expect(
        page(
          {
            type: 'row',
            id: 'outer',
            items: [
              { type: 'section', id: 'left', span: 8, items: ['name', 'email'] },
              {
                type: 'row',
                id: 'inner',
                items: [{ type: 'slot', name: 'submit' }, { type: 'divider' }],
              },
            ],
          },
          '*',
        ).slice(0, 7),
      ).toEqual([
        'row outer',
        '  section left:8',
        '    name',
        '    email',
        '  row inner:4',
        '    slot submit:6',
        '    divider:6',
      ])
    })
  })

  describe('the fields inside a group or an array', () => {
    it('lays out a group with "items", from inside the group', () => {
      expect(
        page(
          { field: 'address', items: [{ type: 'row', items: ['zip', 'city'] }, 'street'] },
          '*',
        ).slice(0, 5),
      ).toEqual(['address', '  row', '    address.zip:6', '    address.city:6', '  address.street'])
    })

    it('lays out each item of an array with the array\'s "items"', () => {
      expect(page({ field: 'lines', items: ['qty', '*'] }, '*').slice(0, 3)).toEqual([
        'lines',
        '  lines.*.qty',
        '  lines.*.product',
      ])
    })

    it("lays out your own container's fields", () => {
      expect(page({ field: 'billing', items: ['vat'] }, '*').slice(0, 2)).toEqual([
        'billing',
        '  billing.vat',
      ])
    })

    it('gives a display element written in the layout the data path of the fields around it', () => {
      const layout = getLayout(
        pageOf(
          { field: 'lines', items: [{ type: 'heading', id: 'line', text: 'Line' }, '*'] },
          '*',
        ),
      )
      const lines = layout.steps[0]?.children[0] as LayoutField
      const heading = lines.children[0] as LayoutField

      expect(heading.node).toEqual({
        field: { type: 'heading', id: 'line', text: 'Line' },
        type: 'heading',
        role: 'display',
        kind: 'none',
        itemKind: undefined,
        dataPath: ['lines', '*'],
        definitionPath: ['layout', 'items', 0, 'items', 0],
        children: [],
      })
    })
  })

  it('keeps sections, steps, slots and display elements as written', () => {
    const section = {
      type: 'section',
      id: 's',
      label: 'You',
      description: 'D',
      ui: { a: 1 },
      items: ['*'],
    }
    const step = { id: 'one', label: 'One', description: 'First', ui: { b: 2 }, items: [section] }
    const json = withLayout({
      ui: { steps: 'tabs' },
      steps: [step, { items: [{ type: 'slot', name: 'x' }] }],
    })
    const layout = getLayout(json)

    expect(layout.ui).toEqual({ steps: 'tabs' })
    expect(layout.steps[0]?.step).toBe(step)
    expect(layout.steps[0]?.children[0]).toMatchObject({ type: 'section', section, span: 12 })
    expect(layout.steps[1]?.children).toEqual([{ type: 'slot', name: 'x', key: '0', span: 12 }])
    expect(layout.steps[1]?.fields).toEqual([])
  })

  it('keys each node by its index among its siblings', () => {
    const layout = getLayout(pageOf({ type: 'divider' }, 'name', '*'))
    const keys = layout.steps[0]?.children.map((node) => node.key)

    // The divider, name, and the six fields "*" places.
    expect(keys).toEqual(['0', '1', '2', '3', '4', '5', '6', '7'])
  })

  it('lists the fields with a value of each step, in layout order', () => {
    const json = withLayout({
      steps: [
        {
          items: [
            { type: 'heading', text: 'One' },
            'email',
            { field: 'lines', items: ['qty', 'product'] },
          ],
        },
        { items: ['*'] },
      ],
    })
    const [one] = getLayout(json).steps

    expect(one?.fields.map((field) => field.dataPath.join('.'))).toEqual([
      'email',
      'lines',
      'lines.*.qty',
      'lines.*.product',
    ])
  })

  it('throws a DefinitionError with every issue, like build()', () => {
    expect(() => getLayout(pageOf('name'))).toThrow(DefinitionError)
    expect(() => getLayout({ version: '1', fields: [{ name: 'a', type: 'nope' }] })).toThrow(
      DefinitionError,
    )
  })

  it('never changes the schema: a layout only says where the fields go', () => {
    const json = withLayout({ steps: [{ items: ['email', 'name'] }, { items: ['*'] }] })
    const input = { name: 'Ana', email: 'ana@example.com', lines: [{ product: 'Pen' }] }

    expect(v.parse(builder.build(json), input)).toEqual(
      v.parse(builder.build({ version: '1', fields }), input),
    )
    expect(builder.getInitialInput(json)).toEqual(builder.getInitialInput({ version: '1', fields }))
  })

  it.each(Object.entries(layoutFixtures))('resolves the %s fixture', (_, fixture) => {
    expect(getLayout(fixture as JsonForm).steps.length).toBeGreaterThan(0)
  })

  it('resolves the checkout fixture to its 12-column grid', () => {
    const [step] = getLayout(layoutFixtures['checkout'] as JsonForm).steps
    expect(outline(step?.children ?? [])).toEqual([
      'row',
      '  section delivery:8',
      '    row',
      '      name:6',
      '      email:6',
      '    address',
      '      address.street',
      '      row',
      '        address.city:8',
      '        address.zip:4',
      '    lines',
      '      row',
      '        lines.*.product:9',
      '        lines.*.quantity:3',
      '  section summary:4',
      '    slot shipping',
      '    coupon',
      '    newsletter',
      '    acceptTerms',
      '    paragraph',
      '    slot submit',
    ])
  })
})

describe('checking the layout', () => {
  it.each<[string, JsonLayout]>([
    ['every field', { items: ['*'] }],
    ['a group by its fields', { items: ['address.street', 'address.city', 'address.zip', '*'] }],
    ['"*" in a section', { items: [{ type: 'section', items: ['*'] }] }],
    ['"*" once per container', { items: ['*', { field: 'lines', items: ['*'] }] }],
    ['steps', { steps: [{ items: ['name'] }, { items: ['*'] }] }],
  ])('accepts %s', (_, layout) => {
    expect(validate(withLayout(layout))).toEqual({ success: true, issues: [] })
  })

  it.each<[string, unknown, { code: string; path: (string | number)[] }[]]>([
    ['a layout that is no object', [], [{ code: 'invalid_shape', path: at() }]],
    ['neither items nor steps', {}, [{ code: 'invalid_shape', path: at() }]],
    [
      'both items and steps',
      { items: ['*'], steps: [{ items: ['*'] }] },
      [{ code: 'invalid_shape', path: at() }],
    ],
    [
      'an unknown key',
      { items: ['*'], columns: 2 },
      [{ code: 'unknown_key', path: at('columns') }],
    ],
    [
      'a ui that is no object',
      { items: ['*'], ui: [] },
      [{ code: 'invalid_shape', path: at('ui') }],
    ],
    ['empty items', { items: [] }, [{ code: 'invalid_shape', path: at('items') }]],
    ['empty steps', { steps: [] }, [{ code: 'invalid_shape', path: at('steps') }]],
    [
      'a step that is no object',
      { steps: ['*'] },
      [{ code: 'invalid_shape', path: at('steps', 0) }],
    ],
    [
      'a step without items',
      { steps: [{ label: 'One' }, { items: ['*'] }] },
      [{ code: 'invalid_shape', path: at('steps', 0, 'items') }],
    ],
    [
      'an unknown key on a step',
      { steps: [{ title: 'One', items: ['*'] }] },
      [{ code: 'unknown_key', path: at('steps', 0, 'title') }],
    ],
    [
      'a label that is no string',
      { steps: [{ label: 1, items: ['*'] }] },
      [{ code: 'invalid_shape', path: at('steps', 0, 'label') }],
    ],
    [
      'an item that is no object',
      { items: [1, '*'] },
      [{ code: 'invalid_shape', path: at('items', 0) }],
    ],
    [
      'an object without field or type',
      { items: [{ label: 'x' }, '*'] },
      [{ code: 'invalid_shape', path: at('items', 0) }],
    ],
    ['"*" twice', { items: ['*', '*'] }, [{ code: 'invalid_shape', path: at('items', 1) }]],
    [
      '"*" twice across steps',
      { steps: [{ items: ['*'] }, { items: ['*'] }] },
      [{ code: 'invalid_shape', path: at('steps', 1, 'items', 0) }],
    ],
  ])('reports %s', (_, layout, expected) => {
    expect(codesAndPaths(layout)).toEqual(expected)
  })

  describe('references', () => {
    it.each<[string, unknown, { code: string; path: (string | number)[] }[]]>([
      ['an unknown field', ['nmae', '*'], [{ code: 'unknown_field', path: at('items', 0) }]],
      ['an empty path', ['', '*'], [{ code: 'unknown_field', path: at('items', 0) }]],
      [
        'a path past a field with a value',
        ['name.first', '*'],
        [{ code: 'unknown_field', path: at('items', 0) }],
      ],
      [
        "a field of an array's items",
        ['lines.*.product', '*'],
        [{ code: 'unknown_field', path: at('items', 0) }],
      ],
      [
        'a display element, which has no path',
        [{ field: 'heading' }, '*'],
        [{ code: 'unknown_field', path: at('items', 0, 'field') }],
      ],
      [
        'a field outside the container',
        [{ field: 'address', items: ['name', '*'] }, '*'],
        [{ code: 'unknown_field', path: at('items', 0, 'items', 0) }],
      ],
      [
        'a field that is no dot path',
        [{ field: 1 }, '*'],
        [{ code: 'invalid_shape', path: at('items', 0, 'field') }],
      ],
      [
        'an unknown key on a field',
        [{ field: 'name', label: 'x' }, '*'],
        [{ code: 'unknown_key', path: at('items', 0, 'label') }],
      ],
    ])('reports %s', (_, items, expected) => {
      expect(codesAndPaths({ items })).toEqual(expected)
    })

    it('names the container a path is from', () => {
      const [issue] = validate(pageOf({ field: 'address', items: ['cty', '*'] }, '*')).issues
      expect(issue?.message).toBe('Unknown field "cty" in "address"')
    })

    it('says how to lay out the fields of an array', () => {
      const [issue] = validate(pageOf('lines.*.qty', '*')).issues
      expect(issue?.message).toBe(
        '"lines.*.qty" is in the items of "lines", which have no index here. Place "lines", and lay out its items with "items"',
      )
    })

    it.each<[string, unknown]>([
      ['a field with a value', { field: 'name', items: ['*'] }],
      ['a list of single values', { field: 'tags', items: ['*'] }],
    ])('reports items on %s', (_, item) => {
      expect(codesAndPaths({ items: [item, '*'] })).toEqual([
        { code: 'invalid_shape', path: at('items', 0, 'items') },
      ])
    })

    it('still checks the shape of items it reports', () => {
      expect(codesAndPaths({ items: [{ field: 'nope', items: [{ type: 'row' }] }, '*'] })).toEqual([
        { code: 'unknown_field', path: at('items', 0, 'field') },
        { code: 'invalid_shape', path: at('items', 0, 'items', 0, 'items') },
      ])
    })
  })

  describe('placing each field once', () => {
    it.each<[string, unknown[], (string | number)[], string]>([
      ['twice', ['name', 'name', '*'], at('items', 1), 'Field "name" is placed twice'],
      [
        'in a group placed already',
        ['address', 'address.city', '*'],
        at('items', 1),
        'Field "address.city" is placed already, with "address"',
      ],
      [
        'a group with a field placed already',
        ['address.city', { field: 'address' }, '*'],
        at('items', 1, 'field'),
        'Field "address" holds fields that are placed already',
      ],
    ])('reports a field placed %s', (_, items, path, message) => {
      expect(validate(withLayout({ items })).issues).toEqual([
        { code: 'duplicate_placement', path, message },
      ])
    })

    it('reports a field placed in two steps', () => {
      expect(codesAndPaths({ steps: [{ items: ['name', '*'] }, { items: ['name'] }] })).toEqual([
        { code: 'duplicate_placement', path: at('steps', 1, 'items', 0) },
      ])
    })

    it('reports each field placed nowhere, on the list that misses it', () => {
      expect(validate(pageOf('name', 'email', 'address.city', 'tags', 'lines')).issues).toEqual([
        {
          code: 'unplaced_field',
          path: at(),
          message: `The "heading" at fields[0] isn't placed. Add "*", or write it in the layout`,
        },
        {
          code: 'unplaced_field',
          path: at(),
          message: `Field "address.street" isn't placed. Place it, or add "*" for the fields you don't list`,
        },
        {
          code: 'unplaced_field',
          path: at(),
          message: `Field "address.zip" isn't placed. Place it, or add "*" for the fields you don't list`,
        },
        {
          code: 'unplaced_field',
          path: at(),
          message: `Field "billing" isn't placed. Place it, or add "*" for the fields you don't list`,
        },
      ])
    })

    it('reports a field of a container placed nowhere in its items', () => {
      expect(codesAndPaths({ items: [{ field: 'lines', items: ['qty'] }, '*'] })).toEqual([
        { code: 'unplaced_field', path: at('items', 0, 'items') },
      ])
    })
  })

  describe('rows', () => {
    const row = (...items: unknown[]) => codesAndPaths({ items: [{ type: 'row', items }, '*'] })

    it.each<[string, unknown[], (string | number)[]]>([
      ['a span over 12', [{ field: 'name', span: 13 }], at('items', 0, 'items', 0, 'span')],
      ['a span of 0', [{ field: 'name', span: 0 }], at('items', 0, 'items', 0, 'span')],
      [
        'a span that is no whole number',
        [{ field: 'name', span: 2.5 }],
        at('items', 0, 'items', 0, 'span'),
      ],
      [
        'a span that is no number',
        [{ type: 'divider', span: '6' }],
        at('items', 0, 'items', 0, 'span'),
      ],
      [
        'spans over 12 columns',
        [
          { field: 'name', span: 8 },
          { field: 'email', span: 6 },
        ],
        at('items', 0),
      ],
      ['a cell without columns left', [{ field: 'name', span: 12 }, 'email'], at('items', 0)],
      [
        'columns that cells share unevenly',
        [{ field: 'name', span: 5 }, 'email', 'tags'],
        at('items', 0),
      ],
      ['five cells without a span', ['name', 'email', 'tags', 'lines', 'billing'], at('items', 0)],
    ])('reports %s as invalid_span', (_, items, path) => {
      expect(row(...items)).toContainEqual({ code: 'invalid_span', path })
    })

    it.each<[string, unknown[], (string | number)[]]>([
      ['"*" as a cell', ['name', '*'], at('items', 0, 'items', 1)],
      ['an empty row', [], at('items', 0, 'items')],
    ])('reports %s', (_, items, path) => {
      expect(row(...items)).toContainEqual({ code: 'invalid_shape', path })
    })

    it('reports a span outside a row', () => {
      expect(codesAndPaths({ items: [{ field: 'name', span: 6 }, '*'] })).toEqual([
        { code: 'invalid_span', path: at('items', 0, 'span') },
      ])
    })

    it('says what is wrong with the spans', () => {
      expect(
        validate(
          pageOf(
            {
              type: 'row',
              items: [
                { field: 'name', span: 8 },
                { field: 'email', span: 6 },
              ],
            },
            '*',
          ),
        ).issues[0]?.message,
      ).toBe('A row has 12 columns, and its spans add up to 14. Put the rest in another row')
      expect(
        validate(pageOf({ type: 'row', items: [{ field: 'name', span: 5 }, 'email', 'tags'] }, '*'))
          .issues[0]?.message,
      ).toBe(
        'The spans leave 7 of 12 columns to share evenly between 2 items without a span. Give them a span',
      )
    })

    it('reports an unknown key on a row', () => {
      expect(row('name', { type: 'row', columns: 2, items: ['email'] })).toEqual([
        { code: 'unknown_key', path: at('items', 0, 'items', 1, 'columns') },
      ])
    })
  })

  describe('sections, slots and display elements', () => {
    it.each<[string, unknown, { code: string; path: (string | number)[] }[]]>([
      [
        'a section without items',
        { type: 'section', label: 'A' },
        [{ code: 'invalid_shape', path: at('items', 0, 'items') }],
      ],
      [
        'an unknown key on a section',
        { type: 'section', title: 'A', items: ['name'] },
        [{ code: 'unknown_key', path: at('items', 0, 'title') }],
      ],
      [
        'a description that is no string',
        { type: 'section', description: 2, items: ['name'] },
        [{ code: 'invalid_shape', path: at('items', 0, 'description') }],
      ],
      [
        'a slot without a name',
        { type: 'slot' },
        [{ code: 'invalid_shape', path: at('items', 0, 'name') }],
      ],
      [
        'an unknown key on a slot',
        { type: 'slot', name: 'a', label: 'A' },
        [{ code: 'unknown_key', path: at('items', 0, 'label') }],
      ],
      [
        'a slot in the items of an array',
        { field: 'lines', items: [{ type: 'slot', name: 'a' }, '*'] },
        [{ code: 'invalid_shape', path: at('items', 0, 'items', 0) }],
      ],
      [
        'an unknown type',
        { type: 'grid', items: ['name'] },
        [{ code: 'unknown_type', path: at('items', 0, 'type') }],
      ],
      [
        'a type with a value',
        { type: 'email', id: 'e' },
        [{ code: 'invalid_shape', path: at('items', 0, 'type') }],
      ],
      [
        'a name on a display element',
        { type: 'heading', name: 'h', text: 'Hi' },
        [{ code: 'unknown_key', path: at('items', 0, 'name') }],
      ],
      [
        "a display element's props",
        { type: 'heading', text: 'Hi', level: 9 },
        [{ code: 'invalid_props', path: at('items', 0, 'level') }],
      ],
      [
        'an unknown key on a display element',
        { type: 'divider', width: 2 },
        [{ code: 'unknown_key', path: at('items', 0, 'width') }],
      ],
      [
        'rules on a display element',
        { type: 'paragraph', text: 'Hi', rules: [] },
        [{ code: 'invalid_shape', path: at('items', 0, 'rules') }],
      ],
    ])('reports %s', (_, item, expected) => {
      expect(codesAndPaths({ items: [item, '*'] })).toEqual(expected)
    })

    it('reports a slot in a group in the items of an array', () => {
      const json = {
        version: '1',
        fields: [
          {
            name: 'stops',
            type: 'array',
            fields: [{ name: 'address', type: 'group', fields: [{ name: 'city', type: 'text' }] }],
          },
        ],
        layout: {
          items: [
            {
              field: 'stops',
              items: [{ field: 'address', items: ['*', { type: 'slot', name: 'a' }] }],
            },
          ],
        },
      } as JsonForm
      expect(validate(json).issues.map(({ code, path }) => ({ code, path }))).toEqual([
        { code: 'invalid_shape', path: at('items', 0, 'items', 0, 'items', 1) },
      ])
    })
  })

  describe('ids', () => {
    it('accepts ids on steps, sections, rows and display elements', () => {
      const json = withLayout({
        steps: [
          {
            id: 'a',
            items: [
              { type: 'section', id: 'b', items: ['name'] },
              { type: 'row', id: 'c', items: ['email'] },
              { type: 'divider', id: 'd' },
            ],
          },
          { id: 'e', items: ['*'] },
        ],
      })
      expect(validate(json).issues).toEqual([])
    })

    it('reports the second of two nodes with the same id', () => {
      const layout = {
        steps: [
          { id: 'one', items: [{ type: 'section', id: 'two', items: ['name'] }] },
          { id: 'two', items: ['*'] },
        ],
      }
      expect(validate(withLayout(layout)).issues).toEqual([
        {
          code: 'duplicate_id',
          path: at('steps', 1, 'id'),
          message: 'Duplicate id "two". The first one is at layout.steps[0].items[0]',
        },
      ])
    })

    it.each(['', 3])('reports the id %j', (id) => {
      expect(codesAndPaths({ items: [{ type: 'divider', id }, '*'] })).toEqual([
        { code: 'invalid_shape', path: at('items', 0, 'id') },
      ])
    })
  })

  it('checks the shape of the layout, but not its references, while the fields have issues', () => {
    const json = {
      version: '1',
      fields: [{ name: 'a', type: 'nope' }],
      layout: { items: ['b', { type: 'section' }] },
    }
    expect(validate(json).issues.map(({ code, path }) => ({ code, path }))).toEqual([
      { code: 'unknown_type', path: ['fields', 0, 'type'] },
      { code: 'invalid_shape', path: at('items', 1, 'items') },
    ])
  })

  it('reports the issues of the layout after those of the form rules', () => {
    const json = {
      version: '1',
      fields: [{ name: 'a', type: 'text' }],
      formRules: [{ rule: 'sameAs', field: 'b', other: 'a', message: 'm' }],
      layout: { items: ['c', '*'] },
    }
    expect(validate(json).issues.map(({ path }) => path)).toEqual([
      ['formRules', 0, 'field'],
      at('items', 0),
    ])
  })

  it('reads an unknown key of the definition still', () => {
    expect(validate({ version: '1', fields: [], layouts: {} }).issues).toEqual([
      { code: 'unknown_key', path: ['layouts'], message: 'Unknown key "layouts" on the form' },
    ])
  })
})
