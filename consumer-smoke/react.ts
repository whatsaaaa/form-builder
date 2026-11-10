// Server-renders the form with the React adapter, the way an SSR framework does, without JSX.
import { Form } from '@formisch/react'
import { JsonFields, useJsonForm, type ValueFieldProps } from '@whatsaaaa/form-builder-react'
import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { builder, checkServer, definition } from './definition.js'

function TextInput({ field, input, inputProps, setInput }: ValueFieldProps) {
  return h(
    'label',
    null,
    field.label,
    h('input', {
      ...inputProps,
      value: String(input ?? ''),
      onChange: (event: { target: { value: string } }) => setInput(event.target.value),
    }),
  )
}

const components = { email: TextInput, radio: TextInput, text: TextInput, money: TextInput }

function App() {
  const jsonForm = useJsonForm(definition, { builder, components })
  return h(Form, { of: jsonForm.form, onSubmit: () => {} }, h(JsonFields, { of: jsonForm }))
}

checkServer()
const html = renderToString(h(App))
// The first step, without the company field its condition hides, nor the second step's budget.
if (
  !html.includes('name="[&quot;email&quot;]"') ||
  html.includes('Company') ||
  html.includes('Budget')
) {
  throw new Error(`Unexpected HTML: ${html}`)
}
console.log('react ok:', html)
