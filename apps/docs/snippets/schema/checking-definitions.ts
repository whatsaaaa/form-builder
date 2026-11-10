import {
  createSchemaBuilder,
  DefinitionError,
  formatPath,
} from '@whatsaaaa/form-builder-schema'

const builder = createSchemaBuilder()

// #region validate
const json: unknown = {
  version: '1',
  fields: [
    { name: 'email', type: 'emial' },
    {
      name: 'age',
      type: 'number',
      rules: [{ rule: 'minLength', value: 3 }],
    },
  ],
}

const result = builder.validate(json)
if (!result.success) {
  for (const issue of result.issues) {
    console.log(formatPath(issue.path), issue.code, issue.message)
    // fields[0].type unknown_type Unknown field type "emial"
    // fields[1].rules[0].rule kind_mismatch Rule "minLength" can't be used on number fields
  }
}
// #endregion validate

// #region build
try {
  builder.build({
    version: '1',
    fields: [{ name: 'email', type: 'emial' }],
  })
} catch (error) {
  if (error instanceof DefinitionError) {
    console.log(error.issues) // every issue, as validate() gives them
  }
}
// #endregion build

if (
  result.success ||
  result.issues.map((issue) => issue.code).join() !==
    'unknown_type,kind_mismatch'
) {
  throw new Error(`Unexpected issues: ${JSON.stringify(result.issues)}`)
}
