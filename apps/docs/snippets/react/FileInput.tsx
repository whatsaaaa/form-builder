import type { ValueFieldProps } from '@whatsaaaa/form-builder-react'

export function FileInput({
  field,
  kind,
  errors,
  inputProps,
  setInput,
}: ValueFieldProps) {
  return (
    <label>
      {field.label}
      {/* Never set a file input's value. setInput turns the FileList into files. */}
      <input
        {...inputProps}
        type="file"
        multiple={kind === 'array'}
        accept={field.accept as string | undefined}
        onChange={(event) => setInput(event.target.files)}
      />
      {errors && <small>{errors[0]}</small>}
    </label>
  )
}
