import {
  createBuildContext,
  createSchemaBuilder,
  defineFieldType,
  type JsonField,
} from '@whatsaaaa/form-builder-schema'
import * as v from 'valibot'

// #region tags
const tags = defineFieldType({
  kind: 'array',
  itemKind: 'string',
  props: v.object({ max: v.optional(v.number()) }),
  schema: (field) =>
    v.pipe(v.array(v.string()), v.maxLength(field.max ?? 10)), // field.max is typed
  meta: { label: 'Tags', description: 'A list of short texts' },
})

const builder = createSchemaBuilder({ fieldTypes: { tags } })
// #endregion tags

// #region kind
const choice = defineFieldType({
  // A choice with number values holds a number, so number rules fit it.
  kind: (field) =>
    typeof field.values[0] === 'number' ? 'number' : 'string',
  props: v.object({ values: v.array(v.union([v.string(), v.number()])) }),
  schema: (field) => v.picklist(field.values),
})
// #endregion kind

// #region container
const fieldset = defineFieldType({
  kind: 'object',
  container: true,
  props: v.object({
    legend: v.optional(v.string()),
    fields: v.array(v.looseObject({ type: v.string() })),
  }),
  // The builder checks the child fields like any others, so their issues have their full path.
  schema: (field, ctx) =>
    ctx.buildFields(field.fields, [...ctx.path, 'fields']),
})
// #endregion container

// #region test
const field: JsonField = { name: 'tags', type: 'tags', max: 3 }
const schema = tags.schema?.(
  { ...field, max: 3 },
  createBuildContext({ path: ['fields', 0] }),
)
// #endregion test

const all = createSchemaBuilder({ fieldTypes: { tags, choice, fieldset } })
const json = {
  version: '1' as const,
  fields: [
    { name: 'labels', type: 'tags', max: 2 },
    {
      name: 'size',
      type: 'choice',
      values: [1, 2, 3],
      rules: [{ rule: 'minValue', value: 2 }],
    },
    {
      name: 'contact',
      type: 'fieldset',
      fields: [{ name: 'email', type: 'email' }],
    },
  ],
}
const issues = all.validate(json).issues
if (issues.length) throw new Error(JSON.stringify(issues))
if (all.getFieldTree(json)[2]?.role !== 'group')
  throw new Error('fieldset is no group')
v.parse(all.build(json), {
  labels: ['a'],
  size: 2,
  contact: { email: 'jane@example.com' },
})
if (schema === undefined || builder.fieldTypes.tags !== tags)
  throw new Error('No tags schema')
