import * as v from 'valibot'
import type { AnyAction, AnySchema } from './valibot-types';

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
          received: issue.received
        })
      }
    }
  })
}
