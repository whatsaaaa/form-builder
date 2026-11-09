import * as v from 'valibot'
import { createSchemaBuilder, type JsonField, type JsonForm } from '@whatsaaaa/form-builder-schema'
import { affects } from '@whatsaaaa/form-builder-affects'
import business from '../../../fixtures/affects/business.json'
import order from '../../../fixtures/affects/order.json'
import shipping from '../../../fixtures/affects/shipping.json'
import signUp from '../../../fixtures/affects/sign-up.json'

export const builder = createSchemaBuilder({ extensions: [affects()] })

export const form = (...fields: JsonField[]): JsonForm => ({ version: '1', fields })

/**
 * The shared fixtures with affects. TypeScript reads `version` in a JSON file as any string, so
 * they are cast once here.
 */
export const fixtures = { business, shipping, order, 'sign-up': signUp } as unknown as Record<
  'business' | 'shipping' | 'order' | 'sign-up',
  JsonForm
>

/** Each issue of a parse, as `path: message`, the path as Formisch reads it. */
export function issuesOf(json: JsonForm, input: unknown): string[] {
  const result = v.safeParse(builder.build(json), input)
  return (result.issues ?? []).map(
    (issue) => `${(issue.path ?? []).map((item) => item.key).join('.')}: ${issue.message}`,
  )
}

/** The output of a parse, which must succeed. */
export const outputOf = (json: JsonForm, input: unknown) => v.parse(builder.build(json), input)

/** The issues `validate()` gives, as `code at path: message`. */
export function definitionIssues(json: unknown): string[] {
  return builder
    .validate(json)
    .issues.map((issue) => `${issue.code} at ${issue.path.join('.')}: ${issue.message}`)
}
