import { Form } from '@formisch/react'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { JsonFields, useJsonForm } from '@whatsaaaa/form-builder-react'
import { useState } from 'react'
import { builder } from '../schema/fills'
import { components } from './all-fields'

export function ProfileForm({ definition }: { definition: JsonForm }) {
  const [fillError, setFillError] = useState<string>()
  const jsonForm = useJsonForm(definition, {
    // Its fills() knows the sources the definition names.
    builder,
    components,
    // Called with each error of a fill, like a profile that couldn't load.
    onFillError: () =>
      setFillError(
        "Couldn't load the profile. Fill in the fields yourself.",
      ),
  })

  function save(output: unknown) {
    // { profile: 'a', firstName: 'Marko', lastName: 'Petrović', address: { city: 'Beograd' } }
    console.log(output)
  }

  return (
    <Form of={jsonForm.form} onSubmit={save}>
      <JsonFields of={jsonForm} />
      {fillError && <p role="alert">{fillError}</p>}
      {/* Off while a fill waits for its values. */}
      <button type="submit" disabled={jsonForm.fills.pending.length > 0}>
        Save
      </button>
    </Form>
  )
}
