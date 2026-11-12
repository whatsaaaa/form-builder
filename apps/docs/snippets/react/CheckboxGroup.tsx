import type { ValueFieldProps } from '@whatsaaaa/form-builder-react'

type Option = { value: string | number | boolean; label: string }

export function CheckboxGroup({
  field,
  input,
  errors,
  inputProps,
  setInput,
}: ValueFieldProps) {
  const options = (field.options ?? []) as Option[]
  const picked = Array.isArray(input) ? (input as unknown[]) : []

  // The list with the option in or out, in the order of the options.
  function toggle(option: Option, checked: boolean) {
    setInput(
      options
        .filter((each) =>
          each === option ? checked : picked.includes(each.value),
        )
        .map((each) => each.value),
    )
  }

  return (
    <fieldset>
      <legend>{field.label}</legend>
      {options.map((option, index) => (
        <label key={index}>
          {/* Each checkbox of the field takes inputProps. */}
          <input
            {...inputProps}
            type="checkbox"
            checked={picked.includes(option.value)}
            onChange={(event) => toggle(option, event.target.checked)}
          />
          {option.label}
        </label>
      ))}
      {errors && <small>{errors[0]}</small>}
    </fieldset>
  )
}
