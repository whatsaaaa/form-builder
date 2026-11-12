import { Form } from '@formisch/react'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { JsonFields, useJsonForm } from '@whatsaaaa/form-builder-react'
import { components } from './fields'

interface Customer {
  name: string
  email: string
  newsletter: boolean
}

interface EditCustomerProps {
  definition: JsonForm
  customer: Customer
  onSave: (customer: Customer) => void
}

export function EditCustomer(props: EditCustomerProps) {
  const jsonForm = useJsonForm<Customer>(props.definition, {
    components,
    // The form starts with the customer's values.
    initialInput: props.customer,
  })

  return (
    <Form of={jsonForm.form} onSubmit={props.onSave}>
      <JsonFields of={jsonForm} />
      <button type="submit">Save</button>
    </Form>
  )
}
