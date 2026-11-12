import { Form } from '@formisch/react'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { JsonFields, useJsonForm } from '@whatsaaaa/form-builder-react'
import { useLayoutEffect, useRef } from 'react'
import { components } from './all-fields'
import { layoutComponents } from './layout'

export function SignUpSteps({ definition }: { definition: JsonForm }) {
  const jsonForm = useJsonForm(definition, { components, layoutComponents })
  const { steps } = jsonForm

  // A new step moves the focus to its heading, so keyboard and screen
  // reader users notice it. A layout effect runs once the step has
  // rendered, and before the adapter focuses a field with an error.
  const heading = useRef<HTMLHeadingElement>(null)
  const step = steps.current
  const shown = useRef(step)
  useLayoutEffect(() => {
    if (shown.current === step) return
    shown.current = step
    heading.current?.focus()
  }, [step])

  function save(output: unknown) {
    console.log(output)
  }

  return (
    <Form of={jsonForm.form} onSubmit={save}>
      <ol>
        {steps.list.map((each, index) => (
          <li
            key={each.step.id ?? index}
            aria-current={index === steps.index ? 'step' : undefined}
          >
            {each.step.label}
          </li>
        ))}
      </ol>
      <h2 ref={heading} tabIndex={-1}>
        {step.step.label}
      </h2>
      <JsonFields of={jsonForm} />
      {!steps.isFirst && (
        <button type="button" onClick={steps.back}>
          Back
        </button>
      )}
      {/* A submit before the last step is a Next: Enter moves on. */}
      <button type="submit">{steps.isLast ? 'Sign up' : 'Next'}</button>
    </Form>
  )
}
