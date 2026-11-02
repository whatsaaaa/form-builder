import * as v from 'valibot'
import type { AnyAction, AnySchema } from './valibot-types'

/**
 * Checks every item of an array with `schema` and reports the issues on the array itself.
 * Formisch keeps no field for each item of an array value, so an issue with an item's index in
 * its path would show nowhere.
 */
export function eachItem(schema: AnySchema): AnyAction {
  return v.rawCheck(({ dataset, config, addIssue }) => {
    if (!dataset.typed || !Array.isArray(dataset.value)) return
    for (const item of dataset.value as unknown[]) {
      const result = v.safeParse(schema, item, config as v.Config<v.BaseIssue<unknown>>)
      for (const issue of result.issues ?? []) {
        addIssue({
          message: issue.message,
          input: item,
          expected: issue.expected ?? undefined,
          received: issue.received,
        })
      }
    }
  })
}
