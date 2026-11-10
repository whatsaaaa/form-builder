// #region some
import {
  createSchemaBuilder,
  defaultFormRules,
  formatRules,
  lengthRules,
} from '@whatsaaaa/form-builder-schema'

const builder = createSchemaBuilder({
  includeDefaultRules: false,
  rules: { ...formatRules, ...lengthRules },
  formRules: defaultFormRules,
})
// #endregion some

// #region list
const { rulesForKind } = createSchemaBuilder()

const picker = rulesForKind('file').map(([name, def]) => ({
  name,
  label: def.meta?.label ?? name, // 'Minimum size', 'Maximum size', ...
  category: def.meta?.category ?? 'other', // 'file'
}))
// #endregion list

builder.build({ version: '1', fields: [{ name: 'email', type: 'email' }] })
if (picker.length === 0) throw new Error('No rules for files')
