import type { ValueFieldProps } from '@whatsaaaa/form-builder-react'

type Option = { value: string | number | boolean; label: string }

export function SelectInput({
  field,
  input,
  errors,
  inputProps,
  setInput,
}: ValueFieldProps) {
  const options = (field.options ?? []) as Option[]
  // An element's value is a string, so each option's index stands for its value.
  const selected = options.findIndex((option) => option.value === input)
  return (
    <label>
      {field.label}
      <select
        {...inputProps}
        value={selected}
        onChange={(event) =>
          setInput(options[Number(event.target.value)]?.value)
        }
      >
        <option value={-1}>Choose...</option>
        {options.map((option, index) => (
          <option key={index} value={index}>
            {option.label}
          </option>
        ))}
      </select>
      {errors && <small>{errors[0]}</small>}
    </label>
  )
}
