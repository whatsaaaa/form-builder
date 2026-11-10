// Server-renders the form with the Vue adapter, the way an SSR framework does.
import { Form } from '@formisch/vue'
import { JsonFields, useJsonForm, type ValueFieldProps } from '@whatsaaaa/form-builder-vue'
import { createSSRApp, defineComponent, type FunctionalComponent, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { builder, checkServer, definition } from './definition.js'

const TextInput: FunctionalComponent<ValueFieldProps> = ({ field, input, inputProps, setInput }) =>
  h('label', [
    field.label,
    h('input', {
      ...inputProps,
      value: String(input ?? ''),
      onInput: (event: Event) => setInput((event.target as HTMLInputElement).value),
    }),
  ])

const components = { email: TextInput, radio: TextInput, text: TextInput, money: TextInput }

const App = defineComponent({
  setup() {
    const jsonForm = useJsonForm(definition, { builder, components })
    return () =>
      h(Form, { of: jsonForm.form, onSubmit: () => {} }, () => h(JsonFields, { of: jsonForm }))
  },
})

checkServer()
const html = await renderToString(createSSRApp(App))
// The first step, without the company field its condition hides, nor the second step's budget.
if (
  !html.includes('name="[&quot;email&quot;]"') ||
  html.includes('Company') ||
  html.includes('Budget')
) {
  throw new Error(`Unexpected HTML: ${html}`)
}
console.log('vue ok:', html)
