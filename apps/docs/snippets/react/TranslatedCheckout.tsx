import { Form, getInput } from '@formisch/react'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { JsonFields, useJsonForm } from '@whatsaaaa/form-builder-react'
import { useState } from 'react'
import { builders, type Locale } from '../schema/locales'
import { components } from './fields'

// #region switch
type Input = Record<string, unknown>

interface TranslatedFormProps {
  definition: JsonForm
  locale: Locale
  initialInput: Input | undefined
  onLocale: (locale: Locale, input: Input) => void
}

function TranslatedForm(props: TranslatedFormProps) {
  const jsonForm = useJsonForm(props.definition, {
    builder: builders[props.locale],
    components,
    // What the user typed in the form of the other language.
    initialInput: props.initialInput,
  })
  const other = props.locale === 'en' ? 'sr-Latn' : 'en'

  return (
    <Form of={jsonForm.form} onSubmit={(output) => console.log(output)}>
      {/* Hands the input up, for the form of the other language. */}
      <button
        type="button"
        onClick={() => props.onLocale(other, getInput(jsonForm.form))}
      >
        {other === 'en' ? 'English' : 'Srpski'}
      </button>
      <JsonFields of={jsonForm} />
      <button type="submit">Order</button>
    </Form>
  )
}

export function TranslatedCheckout({
  definition,
}: {
  definition: JsonForm
}) {
  const [state, setState] = useState<{ locale: Locale; input?: Input }>({
    locale: 'en',
  })

  // A new key builds the form again, with the builder of the language.
  return (
    <TranslatedForm
      key={state.locale}
      definition={definition}
      locale={state.locale}
      initialInput={state.input}
      onLocale={(locale, input) => setState({ locale, input })}
    />
  )
}
// #endregion switch
