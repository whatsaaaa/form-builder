import { insert, move, remove, useFieldArray } from '@formisch/react'
import type { FieldNode, FieldPath } from '@whatsaaaa/form-builder-schema'
import { type ComponentType, type ReactElement, type ReactNode, useMemo } from 'react'
import type { ArrayFieldProps } from './field-components'
import type { AnyJsonFormInstance } from './use-json-form'

interface ArrayFieldConnectionProps {
  of: AnyJsonFormInstance
  node: FieldNode
  path: FieldPath
  component: ComponentType<ArrayFieldProps>
  /** Renders the fields of the item at `index`. */
  renderItem: (index: number) => ReactNode
}

/** Connects a container of kind `array` to Formisch, and renders your component for it. */
export function ArrayField({
  of,
  node,
  path,
  component: Component,
  renderItem,
}: ArrayFieldConnectionProps): ReactElement {
  // The path comes from the definition at runtime, so the schema's types can't check it.
  const array = useFieldArray(of.form, { path: path as never })

  // Formisch keeps the path it got while the array is the same, so the methods stay the same too.
  const { form, builder } = of
  const { field } = node
  const at = array.path
  const methods = useMemo(
    () => ({
      // A new item starts with the defaults of its fields, like the items of a new form.
      add: () => insert(form, { path: at, initialInput: builder.getItemInput(field) as never }),
      remove: (index: number) => remove(form, { path: at, at: index }),
      move: (from: number, to: number) => move(form, { path: at, from, to }),
    }),
    [form, builder, field, at],
  )

  return (
    <Component field={field} path={path} items={array.items} errors={array.errors} {...methods}>
      {renderItem}
    </Component>
  )
}
