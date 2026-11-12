import type { ValueFieldProps } from '@whatsaaaa/form-builder-react'

type Option = { value: string | number | boolean; label: string }

export function RadioInput({
  field,
  input,
  errors,
  inputProps,
  setInput,
}: ValueFieldProps) {
  const options = (field.options ?? []) as Option[]
  return (
    <fieldset>
      <legend>{field.label}</legend>
      {options.map((option, index) => (
        <label key={index}>
          {/* Each radio takes inputProps: one name, one group. */}
          <input
            {...inputProps}
            type="radio"
            checked={input === option.value}
            onChange={() => setInput(option.value)}
          />
          {option.label}
        </label>
      ))}
      {errors && <small>{errors[0]}</small>}
    </fieldset>
  )
}
