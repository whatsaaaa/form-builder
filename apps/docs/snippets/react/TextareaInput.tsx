import type { ValueFieldProps } from '@whatsaaaa/form-builder-react'

export function TextareaInput({
  field,
  input,
  errors,
  required,
  inputProps,
  setInput,
}: ValueFieldProps) {
  return (
    <label>
      {field.label}
      <textarea
        {...inputProps}
        value={String(input ?? '')}
        placeholder={field.placeholder}
        required={required}
        onChange={(event) => setInput(event.target.value)}
      />
      {errors && <small>{errors[0]}</small>}
    </label>
  )
}
