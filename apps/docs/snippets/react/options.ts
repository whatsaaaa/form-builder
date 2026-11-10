import { affects } from '@whatsaaaa/form-builder-affects'
import { useJsonForm } from '@whatsaaaa/form-builder-react'
import {
  createSchemaBuilder,
  type JsonForm,
} from '@whatsaaaa/form-builder-schema'
import { components } from './all-fields'
import { layoutComponents } from './layout'

// #region options
// Built once, outside the component: the builder is read on the first render.
const builder = createSchemaBuilder({ extensions: [affects()] })

export function useOrderForm(definition: JsonForm) {
  const jsonForm = useJsonForm(definition, {
    // Your own types, rules, messages and extensions. Defaults to createSchemaBuilder().
    builder,
    // Your component for each field type.
    components,
    // Your component for each layout type.
    layoutComponents,
    // When a field is validated the first time, and again after that, as in Formisch.
    validate: 'blur',
    revalidate: 'input',
  })
  return jsonForm
}
// #endregion options
