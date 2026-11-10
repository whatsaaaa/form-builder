import type { ArrayFieldProps } from '@whatsaaaa/form-builder-react'

export function ListRepeater({
  field,
  items,
  errors,
  add,
  remove,
  children,
}: ArrayFieldProps) {
  return (
    <fieldset>
      <legend>{field.label}</legend>
      {items.map((item, index) => (
        <div key={item}>
          {children(index)}
          <button type="button" onClick={() => remove(index)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={add}>
        Add
      </button>
      {errors && <small>{errors[0]}</small>}
    </fieldset>
  )
}
