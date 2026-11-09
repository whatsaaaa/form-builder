import { checkComponents, dotPathOf, findField } from '@whatsaaaa/form-builder-schema'
import type { ReactElement } from 'react'
import type { FieldComponents } from './field-components'
import { type RenderContext, renderField, renderFields, resolveComponents } from './render-fields'
import type { AnyJsonFormInstance } from './use-json-form'

export interface JsonFieldProps {
  /** What `useJsonForm` returned. */
  of: AnyJsonFormInstance
  /** The field's path: `'email'`, or `'address.city'` for a field of a group. */
  path: string
  /** Defaults to the components `useJsonForm` got. */
  components?: FieldComponents | undefined
}

/**
 * Renders one field of a `useJsonForm` form, wherever you put it inside Formisch's `<Form>`. A
 * group or an array comes with its fields. Leave the field out of `<JsonFields>` with `except`.
 */
export function JsonField({ of, path, components }: JsonFieldProps): ReactElement {
  const node = findField(of.fields, path, { placed: true })
  const ctx: RenderContext = { of, components: resolveComponents(components, of) }
  checkComponents([node], ctx.components)

  return renderField(ctx, node, [], dotPathOf(node) ?? '#0', (indexes) =>
    renderFields(ctx, node.children, indexes),
  )
}
