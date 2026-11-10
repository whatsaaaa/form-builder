import type { ValueFieldProps } from '@whatsaaaa/form-builder-react'

// The native input for each type. The rest are text.
const inputTypes: Record<string, string> = {
  email: 'email',
  password: 'password',
  number: 'number',
  url: 'url',
  tel: 'tel',
  date: 'date',
  time: 'time',
  datetime: 'datetime-local',
}

export function TextInput({
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
      <input
        {...inputProps}
        type={inputTypes[field.type] ?? 'text'}
        value={String(input ?? '')}
        placeholder={field.placeholder}
        required={required}
        onChange={(event) => setInput(event.target.value)}
      />
      {errors && <small>{errors[0]}</small>}
    </label>
  )
}
