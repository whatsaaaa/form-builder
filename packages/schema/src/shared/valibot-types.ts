import type * as v from 'valibot'

export type AnySchema = v.GenericSchema
export type AnyAction = v.GenericPipeAction

/**
 * A `v.object()` schema. The builder reads its `entries` to find unknown keys.
 */
export type AnyObjectSchema = v.ObjectSchema<
  v.ObjectEntries,
  v.ErrorMessage<v.ObjectIssue> | undefined
>
