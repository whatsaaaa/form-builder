import { Form } from '@formisch/react'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { JsonFields, useJsonForm } from '@whatsaaaa/form-builder-react'
import { components } from './all-fields'
import { layoutComponents } from './layout'

export function SignUpSteps({ definition }: { definition: JsonForm }) {
  const jsonForm = useJsonForm(definition, { components, layoutComponents })
  const { steps } = jsonForm

  function save(output: unknown) {
    console.log(output)
  }

  return (
    <Form of={jsonForm.form} onSubmit={save}>
      <ol>
        {steps.list.map((step, index) => (
          <li
            key={step.step.id ?? index}
            aria-current={index === steps.index ? 'step' : undefined}
          >
            {step.step.label}
          </li>
        ))}
      </ol>
      <JsonFields of={jsonForm} />
      {!steps.isFirst && (
        <button type="button" onClick={steps.back}>
          Back
        </button>
      )}
      {steps.isLast ? (
        <button type="submit">Sign up</button>
      ) : (
        <button type="button" onClick={() => void steps.next()}>
          Next
        </button>
      )}
    </Form>
  )
}
