import { getErrors, getInput } from '@formisch/vue'
import {
  createSchemaBuilder,
  DefinitionError,
  defineFieldType,
  type JsonField,
  type JsonForm,
} from '@whatsaaaa/form-builder-schema'
import { useJsonForm } from '@whatsaaaa/form-builder-vue'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { fixtures } from './fixtures'
import { form, settle, silenceVueWarnings, withSetup } from './helpers'

// The field tree itself is tested in the schema package, which makes it with getFieldTree().

describe('useJsonForm', () => {
  it('starts the form with the initial input of the definition', () => {
    const { form: store } = withSetup(() => useJsonForm(fixtures.array as JsonForm))

    expect(getInput(store)).toEqual({ tags: ['new'], lines: [] })
  })

  it('throws a DefinitionError for a definition with issues', () => {
    silenceVueWarnings()
    expect(() => withSetup(() => useJsonForm(form({ name: 'a', type: 'nope' })))).toThrow(
      DefinitionError,
    )
  })

  it('validates with the schema the builder builds', async () => {
    const json = form({ name: 'email', type: 'email', required: { message: 'Email please' } })
    const { form: store } = withSetup(() => useJsonForm(json, { validate: 'initial' }))
    await settle()

    expect(getErrors(store, { path: ['email'] })).toEqual(['Email please'])
  })

  it("gives the definition's fields as the builder's tree", () => {
    const builder = createSchemaBuilder()
    for (const json of Object.values(fixtures) as JsonForm[]) {
      const { fields } = withSetup(() => useJsonForm(json))
      expect(fields).toEqual(builder.getFieldTree(json))
    }
  })

  it('reads your own types through the builder you pass', () => {
    // A container type of the consumer's own, built like the built-in group.
    const section = defineFieldType({
      kind: 'object',
      container: true,
      props: v.object({ fields: v.array(v.custom<JsonField>(() => true)) }),
      schema: (field, ctx) => ctx.buildFields(field.fields, [...ctx.path, 'fields']),
    })
    const builder = createSchemaBuilder({ fieldTypes: { section } })
    const json = form({ name: 'person', type: 'section', fields: [{ name: 'name', type: 'text' }] })
    const { fields, form: store } = withSetup(() => useJsonForm(json, { builder }))

    expect(fields).toEqual(builder.getFieldTree(json))
    expect(fields.map((node) => node.role)).toEqual(['group'])
    expect(getInput(store)).toEqual({ person: {} })
  })
})
