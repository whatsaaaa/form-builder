import { getInput } from '@formisch/react'
import type { AnyJsonFormInstance } from '@whatsaaaa/form-builder-react'
import { reviewOf } from './review'

export function ReviewList({ of }: { of: AnyJsonFormInstance }) {
  const { form, steps, visibility } = of
  const input = getInput(form)
  // The steps before the one on show, each with its answers.
  return steps.list.slice(0, steps.index).map((step, index) => (
    <section key={step.step.id ?? index}>
      <h3>{step.step.label}</h3>
      <dl>
        {reviewOf(step, input, visibility).map((row) => (
          <div key={row.key}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      {/* Going back is free: it never validates. */}
      <button type="button" onClick={() => void steps.goTo(index)}>
        Change
      </button>
    </section>
  ))
}
