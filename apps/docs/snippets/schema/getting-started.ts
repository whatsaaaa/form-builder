import {
  createSchemaBuilder,
  type JsonForm,
} from '@whatsaaaa/form-builder-schema'

// #region check
const builder = createSchemaBuilder()

function load(json: unknown): JsonForm {
  const result = builder.validate(json)
  if (!result.success) {
    throw new Error(result.issues.map((issue) => issue.message).join('\n'))
  }
  return json as JsonForm
}
// #endregion check

load({
  version: '1',
  fields: [{ name: 'email', type: 'email', required: true }],
})
