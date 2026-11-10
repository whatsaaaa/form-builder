import type { DisplayFieldProps } from '@whatsaaaa/form-builder-react'

export function FormHeading({ field }: DisplayFieldProps) {
  return <h2>{String(field.text ?? '')}</h2>
}
