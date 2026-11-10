import { Form } from '@formisch/react'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import {
  JsonField,
  JsonFields,
  useJsonForm,
} from '@whatsaaaa/form-builder-react'
import { components } from './all-fields'

export function OrderForm({ definition }: { definition: JsonForm }) {
  const jsonForm = useJsonForm(definition, { components })

  function save(output: unknown) {
    console.log(output)
  }

  return (
    <Form of={jsonForm.form} onSubmit={save}>
      <main>
        <JsonFields of={jsonForm} except={['coupon', 'acceptTerms']} />
      </main>
      <aside>
        <JsonField of={jsonForm} path="coupon" />
        <JsonField of={jsonForm} path="acceptTerms" />
        <button type="submit">Place order</button>
      </aside>
    </Form>
  )
}
