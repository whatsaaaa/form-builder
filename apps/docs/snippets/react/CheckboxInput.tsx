import type { ValueFieldProps } from '@whatsaaaa/form-builder-react'

export function CheckboxInput({
  field,
  input,
  errors,
  inputProps,
  setInput,
}: ValueFieldProps) {
  return (
    <label>
      <input
        {...inputProps}
        type="checkbox"
        checked={input === true}
        onChange={(event) => setInput(event.target.checked)}
      />
      {field.label}
      {errors && <small>{errors[0]}</small>}
    </label>
  )
}
