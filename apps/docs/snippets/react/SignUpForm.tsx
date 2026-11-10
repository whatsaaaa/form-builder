import { Form } from '@formisch/react'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { JsonFields, useJsonForm } from '@whatsaaaa/form-builder-react'
import { components } from './fields'

export function SignUpForm({ definition }: { definition: JsonForm }) {
  const jsonForm = useJsonForm(definition, { components })

  function save(output: unknown) {
    // { email: 'jane@example.com', password: 'correct horse', newsletter: true }
    console.log(output)
  }

  return (
    <Form of={jsonForm.form} onSubmit={save}>
      <JsonFields of={jsonForm} />
      <button type="submit">Sign up</button>
    </Form>
  )
}
