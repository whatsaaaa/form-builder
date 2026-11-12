import { Form } from '@formisch/react'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { JsonFields, useJsonForm } from '@whatsaaaa/form-builder-react'
import { components } from './all-fields'
import { layoutComponents } from './layout'
import { ReviewList } from './ReviewList'

export function SignUpReview({ definition }: { definition: JsonForm }) {
  const jsonForm = useJsonForm(definition, { components, layoutComponents })
  const { steps } = jsonForm

  function save(output: unknown) {
    console.log(output)
  }

  // #region review
  const fields = (
    <JsonFields
      of={jsonForm}
      slots={{ review: <ReviewList of={jsonForm} /> }}
    />
  )
  // #endregion review

  return (
    <Form of={jsonForm.form} onSubmit={save}>
      {fields}
      {!steps.isFirst && (
        <button type="button" onClick={steps.back}>
          Back
        </button>
      )}
      <button type="submit">{steps.isLast ? 'Sign up' : 'Next'}</button>
    </Form>
  )
}
