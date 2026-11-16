import {
  createSchemaBuilder,
  type ExtensionTarget,
  type FieldPath,
  type ResolvedField,
  type SchemaExtension,
  type TargetConditions,
  type TargetFill,
} from '@whatsaaaa/form-builder-schema'
import * as v from 'valibot'

// #region extension
const locked: SchemaExtension = {
  name: 'locked',
  // The key it adds to every field. defineForm() and toJsonSchema() read its type from here.
  fieldProps: v.object({ lockedBy: v.optional(v.string()) }),
  check(ctx) {
    const found = new Map<ExtensionTarget, TargetConditions>()
    for (const target of ctx.targets) {
      const path = target.json['lockedBy']
      if (typeof path !== 'string') continue
      const at = [...target.definitionPath, 'lockedBy']
      // The field it reads, found the way form rules find theirs.
      const field = ctx.resolve(path, target)
      if (typeof field === 'string') ctx.issue('unknown_field', at, field)
      if (typeof field === 'string' || field === null) continue
      found.set(target, {
        reads: [{ field, at }],
        // read(0) is that field's input, or undefined while it is hidden.
        evaluate: (read) => ({ hidden: read(0) === true, clear: false }),
      })
    }
    return found
  },
}

const builder = createSchemaBuilder({ extensions: [locked] })
// #endregion extension

const json = {
  version: '1' as const,
  fields: [
    { name: 'useDefaults', type: 'checkbox' },
    {
      name: 'color',
      type: 'text',
      required: true,
      lockedBy: 'useDefaults',
    },
  ],
}
if (!v.safeParse(builder.build(json), { useDefaults: true }).success) {
  throw new Error('A hidden field was validated')
}
if (
  builder.validate({
    ...json,
    fields: [{ name: 'a', type: 'text', lockedBy: 'b' }],
  }).success
) {
  throw new Error('An unknown field was not reported')
}

// #region fill
// `copyTo` copies a text field to others, like a billing name to the
// shipping name, while the user hasn't changed them.
const copies: SchemaExtension = {
  name: 'copies',
  fieldProps: v.object({ copyTo: v.optional(v.array(v.string())) }),
  check(ctx) {
    for (const target of ctx.targets) {
      const paths = target.json['copyTo']
      if (target.kind !== 'field' || !Array.isArray(paths)) continue
      const at = [...target.definitionPath, 'copyTo']
      // ctx.fill() throws on what isn't a text field: report it first.
      const isText = (field: ResolvedField | null) =>
        field?.role === 'value' && field.kind === 'string'
      const { dataPath } = target.field
      const own = ctx.resolve(dataPath.join('.'), target)
      // null for a field with issues, which are reported already.
      if (own === null) continue
      if (
        typeof own === 'string' ||
        !isText(own) ||
        dataPath.includes('*')
      ) {
        ctx.issue(
          'kind_mismatch',
          at,
          'copyTo goes on a text field, not in a list',
        )
        continue
      }
      const fields: TargetFill['fields'][number][] = []
      for (const [i, path] of paths.entries()) {
        const field = ctx.resolve(String(path), target)
        if (typeof field === 'string') {
          ctx.issue('unknown_field', [...at, i], field)
        } else if (paths.indexOf(path) < i) {
          ctx.issue('invalid_shape', [...at, i], `Lists "${path}" twice`)
        } else if (field && isText(field)) {
          fields.push({ field, at: [...at, i] })
        } else if (field) {
          ctx.issue('kind_mismatch', [...at, i], `"${path}" isn't text`)
        }
      }
      if (fields.length !== paths.length) continue
      ctx.fill(target, {
        fields,
        // A field the user changed keeps their value.
        overwrite: 'unedited',
        // Its values come at once from the definition, so a form
        // starts with the copies of a default.
        static: true,
        values: (value) =>
          Object.fromEntries(paths.map((path) => [path, value])),
      })
    }
    return new Map()
  },
}
// #endregion fill

const shop = createSchemaBuilder({ extensions: [copies] })
const definition = {
  version: '1' as const,
  fields: [
    { name: 'billingName', type: 'text', copyTo: ['shipping.name'] },
    {
      name: 'shipping',
      type: 'group',
      fields: [{ name: 'name', type: 'text' }],
    },
  ],
}

// #region run
const fills = shop.getFills(definition)

// A form in memory. With Formisch: getInput(form), setInput(form, { path,
// input }), and reset(form, { path, initialInput }) for a start value.
let input: Record<string, unknown> = shop.getInitialInput(definition)
// It has fields, and the fields of groups.
const set = ([key, child]: FieldPath, value: unknown) => {
  const at = String(key)
  input = {
    ...input,
    [at]:
      child === undefined
        ? value
        : { ...(input[at] as object), [child]: value },
  }
}
const run = fills.open(
  { getInput: () => input, setInput: set, setStartInput: set },
  {
    onError: (error, { trigger }) =>
      console.error(`The fill of ${trigger} failed`, error),
  },
)
run.start() // once the form is on the page

set(['billingName'], 'Marko Petrović') // the user types
run.update() // after each change of a field of fills.triggers
// input.shipping: { name: 'Marko Petrović' }

run.reset() // after a reset, with { given } for a new initial input
run.stop() // when the form closes
// #endregion run

if ((input['shipping'] as { name?: string }).name !== 'Marko Petrović') {
  throw new Error('The fill did not copy the name')
}
if (
  shop.validate({
    ...definition,
    fields: [{ name: 'a', type: 'text', copyTo: ['b'] }],
  }).success
) {
  throw new Error('An unknown field was not reported')
}
const twice = shop.validate({
  ...definition,
  fields: [
    { name: 'a', type: 'text', copyTo: ['b', 'b'] },
    { name: 'b', type: 'text' },
  ],
}).issues
if (
  twice.length !== 1 ||
  twice[0]?.code !== 'invalid_shape' ||
  twice[0].path.join('.') !== 'fields.0.copyTo.1'
) {
  throw new Error('A path listed twice was not reported')
}
const withIssues = shop.validate({
  ...definition,
  fields: [
    { name: 'a', type: 'text' },
    { name: 'a', type: 'text', copyTo: ['b'] },
    { name: 'b', type: 'text' },
    { name: 'c', type: 'text', nope: 1, copyTo: ['b'] },
  ],
}).issues
if (
  withIssues.map(({ code }) => code).join() !== 'duplicate_name,unknown_key'
) {
  throw new Error('A field with issues got an issue from copyTo')
}
if (
  shop.validate({
    ...definition,
    fields: [
      {
        name: 'lines',
        type: 'array',
        fields: [{ name: 'a', type: 'text', copyTo: [] }],
      },
    ],
  }).issues[0]?.code !== 'kind_mismatch'
) {
  throw new Error('copyTo inside a list was not reported')
}
