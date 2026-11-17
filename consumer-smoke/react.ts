// Server-renders the form with the React adapter, the way an SSR framework does, without JSX.
import { Form } from '@formisch/react'
import { JsonFields, useJsonForm, type ValueFieldProps } from '@whatsaaaa/form-builder-react'
import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { builder, checkServer, definition } from './definition.js'

function TextInput({ field, input, inputProps, setInput, pending }: ValueFieldProps) {
  return h(
    'label',
    null,
    field.label,
    h('input', {
      ...inputProps,
      value: String(input ?? ''),
      'aria-busy': pending || undefined,
      onChange: (event: { target: { value: string } }) => setInput(event.target.value),
    }),
  )
}

const components = {
  email: TextInput,
  radio: TextInput,
  select: TextInput,
  text: TextInput,
  money: TextInput,
}

function App() {
  const jsonForm = useJsonForm(definition, {
    builder,
    components,
    onFillError: (error, { trigger }) => console.error(`The fill of ${trigger} failed`, error),
  })
  return h(
    Form,
    { of: jsonForm.form, onSubmit: () => {} },
    h(JsonFields, { of: jsonForm }),
    h('button', { type: 'submit', disabled: jsonForm.fills.pending.length > 0 }, 'Save'),
  )
}

checkServer()
const html = renderToString(h(App))
// The first step, with the name the profile's map fills in, without the company field its
// condition hides, nor the second step's budget.
if (
  !html.includes('name="[&quot;email&quot;]"') ||
  !html.includes('value="Marko Petrović"') ||
  html.includes('Company') ||
  html.includes('Budget')
) {
  throw new Error(`Unexpected HTML: ${html}`)
}
console.log('react ok:', html)
