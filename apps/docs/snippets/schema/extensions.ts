import {
  createSchemaBuilder,
  type ExtensionTarget,
  type SchemaExtension,
  type TargetConditions,
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
