import { checkComponents, selectFields } from '@whatsaaaa/form-builder-schema'
import type { ReactElement } from 'react'
import type { FieldComponents } from './field-components'
import { type RenderContext, renderFields, resolveComponents } from './render-fields'
import type { AnyJsonFormInstance } from './use-json-form'

export interface JsonFieldsProps {
  /** What `useJsonForm` returned. */
  of: AnyJsonFormInstance
  /** Defaults to the components `useJsonForm` got. */
  components?: FieldComponents | undefined
  /** Renders only these fields, by path, in the order of the definition. */
  only?: readonly string[] | undefined
  /** Leaves out these fields, by path, e.g. the ones you place with `<JsonField>`. */
  except?: readonly string[] | undefined
}

/**
 * Renders the fields of a `useJsonForm` form with your components, one per field type. It renders
 * nothing of its own, so put it inside Formisch's `<Form>` with your own submit button.
 */
export function JsonFields({ of, components, only, except }: JsonFieldsProps): ReactElement {
  const ctx: RenderContext = { of, components: resolveComponents(components, of) }
  const nodes = selectFields(of.fields, { only, except })
  checkComponents(nodes, ctx.components)

  return <>{renderFields(ctx, nodes, [])}</>
}
