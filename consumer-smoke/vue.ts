// Server-renders the form with the Vue adapter, the way an SSR framework does.
import { Form } from '@formisch/vue'
import { JsonFields, useJsonForm, type ValueFieldProps } from '@whatsaaaa/form-builder-vue'
import { createSSRApp, defineComponent, type FunctionalComponent, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { builder, checkServer, definition } from './definition.js'

const TextInput: FunctionalComponent<ValueFieldProps> = ({
  field,
  input,
  inputProps,
  setInput,
  pending,
}) =>
  h('label', [
    field.label,
    h('input', {
      ...inputProps,
      value: String(input ?? ''),
      'aria-busy': pending || undefined,
      onInput: (event: Event) => setInput((event.target as HTMLInputElement).value),
    }),
  ])

const components = {
  email: TextInput,
  radio: TextInput,
  select: TextInput,
  text: TextInput,
  money: TextInput,
}

const App = defineComponent({
  setup() {
    const jsonForm = useJsonForm(definition, {
      builder,
      components,
      onFillError: (error, { trigger }) => console.error(`The fill of ${trigger} failed`, error),
    })
    return () =>
      h(Form, { of: jsonForm.form, onSubmit: () => {} }, () => [
        h(JsonFields, { of: jsonForm }),
        h('button', { type: 'submit', disabled: jsonForm.fills.pending.length > 0 }, 'Save'),
      ])
  },
})

checkServer()
const html = await renderToString(createSSRApp(App))
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
console.log('vue ok:', html)
