import { useField } from '@formisch/react'
import {
  coerceInput,
  type FieldNode,
  type FieldPath,
  isRequired,
} from '@whatsaaaa/form-builder-schema'
import { type ComponentType, type ReactElement, useCallback } from 'react'
import type { ValueFieldProps } from './field-components'
import type { AnyJsonFormInstance } from './use-json-form'

interface ValueFieldConnectionProps {
  of: AnyJsonFormInstance
  node: FieldNode
  path: FieldPath
  component: ComponentType<ValueFieldProps>
}

/** Connects a field with a value to Formisch, and renders your component for it. */
export function ValueField({
  of,
  node,
  path,
  component: Component,
}: ValueFieldConnectionProps): ReactElement {
  // The path comes from the definition at runtime, so the schema's types can't check it.
  const field = useField(of.form, { path: path as never })
  const setInput = useCallback(
    (input: unknown) => field.onChange(coerceInput(input, node) as never),
    [field, node],
  )

  return (
    <Component
      field={node.field}
      path={path}
      kind={node.kind}
      required={isRequired(node.field)}
      input={field.input}
      errors={field.errors}
      inputProps={field.props}
      setInput={setInput}
    />
  )
}
