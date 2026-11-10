import { Form } from '@formisch/react'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import {
  JsonFields,
  type LayoutComponents,
  type RowProps,
  type SectionProps,
  useJsonForm,
} from '@whatsaaaa/form-builder-react'
import { components } from './all-fields'

// #region components
function LayoutSection({ section, children }: SectionProps) {
  return (
    <fieldset>
      <legend>{section.label}</legend>
      {section.description && <p>{section.description}</p>}
      {children}
    </fieldset>
  )
}

// One line of a 12-column grid. The .row class is in the CSS below.
function LayoutRow({ spans, children }: RowProps) {
  return (
    <div className="row">
      {spans.map((span, index) => (
        <div key={index} style={{ gridColumn: `span ${span}` }}>
          {children(index)}
        </div>
      ))}
    </div>
  )
}

export const layoutComponents: LayoutComponents = {
  section: LayoutSection,
  row: LayoutRow,
}
// #endregion components

// #region form
export function CheckoutForm({ definition }: { definition: JsonForm }) {
  const jsonForm = useJsonForm(definition, { components, layoutComponents })

  function save(output: unknown) {
    console.log(output)
  }

  return (
    <Form of={jsonForm.form} onSubmit={save}>
      <JsonFields
        of={jsonForm}
        slots={{ submit: <button type="submit">Place order</button> }}
      />
    </Form>
  )
}
// #endregion form
