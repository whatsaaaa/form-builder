import { getInput, useFieldArray } from '@formisch/react'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { useJsonForm } from '@whatsaaaa/form-builder-react'
import { components } from './fields'

export function useCheckout(definition: JsonForm) {
  // #region typed
  interface CheckoutInput {
    name: string
    address: { city: string }
    lines: { product: string; quantity: number }[]
  }

  const jsonForm = useJsonForm<CheckoutInput>(definition, { components })

  getInput(jsonForm.form, { path: ['address', 'city'] }) // string | undefined
  useFieldArray(jsonForm.form, { path: ['lines'] })
  // #endregion typed

  return jsonForm
}
