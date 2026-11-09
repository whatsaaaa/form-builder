import type {
  ArrayFieldProps,
  DisplayFieldProps,
  FieldComponents,
  FieldPath,
  GroupFieldProps,
  LayoutComponents,
  RowProps,
  SectionProps,
  ValueFieldProps,
} from '@whatsaaaa/form-builder-react'
import { defaultFieldTypes, type FieldTypeDef } from '@whatsaaaa/form-builder-schema'
import { useEffect } from 'react'

/** The props each value field got last, by its path: `'lines.0.quantity'`. */
export const values = new Map<string, ValueFieldProps>()
/** The props each array got last, by its path. */
export const arrays = new Map<string, ArrayFieldProps>()

const id = (path: FieldPath) => path.join('.')

/** A plain input for any value field. */
export function TestInput(props: ValueFieldProps) {
  useEffect(() => {
    values.set(id(props.path), props)
  })
  const { inputProps, input, setInput } = props
  return (
    <div data-role="value" data-path={id(props.path)}>
      <input
        {...inputProps}
        value={typeof input === 'string' || typeof input === 'number' ? input : ''}
        aria-required={props.required}
        onChange={(event) => setInput(event.target.value)}
      />
      {props.errors && <small>{props.errors[0]}</small>}
    </div>
  )
}

export function TestGroup({ path, children }: GroupFieldProps) {
  return (
    <fieldset data-role="group" data-path={id(path)}>
      {children}
    </fieldset>
  )
}

export function TestArray(props: ArrayFieldProps) {
  useEffect(() => {
    arrays.set(id(props.path), props)
  })
  return (
    <section data-role="array" data-path={id(props.path)}>
      {props.items.map((item, index) => (
        <div key={item} data-item={index}>
          {props.children(index)}
        </div>
      ))}
      {props.errors && <small>{props.errors[0]}</small>}
    </section>
  )
}

export function TestText({ field }: DisplayFieldProps) {
  return <p data-role="display">{String(field.text ?? field.type)}</p>
}

/** A component for every built-in type, by the role the type has. */
export const builtInComponents: FieldComponents = Object.fromEntries(
  Object.entries<FieldTypeDef>(defaultFieldTypes).map(([type, def]) => {
    if (def.kind === 'none') return [type, TestText]
    if (def.container) return [type, def.kind === 'array' ? TestArray : TestGroup]
    return [type, TestInput]
  }),
)

export function TestSection({ section, children }: SectionProps) {
  return (
    <fieldset data-section={section.id ?? ''}>
      <legend>{section.label}</legend>
      {children}
    </fieldset>
  )
}

/** Each cell is a `<div>` with its span, like a CSS grid of 12 columns would take it. */
export function TestRow({ row, spans, children }: RowProps) {
  return (
    <div data-row={row.id ?? ''}>
      {spans.map((span, index) => (
        <div key={index} data-span={span}>
          {children(index)}
        </div>
      ))}
    </div>
  )
}

export const layoutComponents: LayoutComponents = { section: TestSection, row: TestRow }
