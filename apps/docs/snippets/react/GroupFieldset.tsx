import type { GroupFieldProps } from '@whatsaaaa/form-builder-react'

export function GroupFieldset({ field, children }: GroupFieldProps) {
  return (
    <fieldset>
      <legend>{field.label}</legend>
      {children}
    </fieldset>
  )
}
