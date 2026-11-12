import { affects } from '@whatsaaaa/form-builder-affects'
import {
  createSchemaBuilder,
  type JsonForm,
} from '@whatsaaaa/form-builder-schema'
import { useJsonForm } from '@whatsaaaa/form-builder-vue'
import { components } from './all-fields'
import LayoutRow from './LayoutRow.vue'
import LayoutSection from './LayoutSection.vue'

export function useOrderForm(
  definition: JsonForm,
  order?: Record<string, unknown>,
) {
  // #region options
  const jsonForm = useJsonForm(definition, {
    // Your own types, rules, messages and extensions. Defaults to createSchemaBuilder().
    builder: createSchemaBuilder({ extensions: [affects()] }),
    // The values the form starts with, over the definition's defaults.
    initialInput: order,
    // Your component for each field type.
    components,
    // Your component for each layout type.
    layoutComponents: { section: LayoutSection, row: LayoutRow },
    // When a field is validated the first time, and again after that, as in Formisch.
    validate: 'blur',
    revalidate: 'input',
  })
  // #endregion options
  return jsonForm
}
