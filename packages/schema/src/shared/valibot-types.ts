import type * as v from 'valibot'

/** Any Valibot schema, such as the one a field type's `schema()` returns. */
export type AnySchema = v.GenericSchema
/** Any Valibot pipe action, such as the one a field type's `required()` or `finalize()` returns. */
export type AnyAction = v.GenericPipeAction

/**
 * A `v.object()` schema. The builder reads its `entries` to find unknown keys.
 */
export type AnyObjectSchema = v.ObjectSchema<
  v.ObjectEntries,
  v.ErrorMessage<v.ObjectIssue> | undefined
>
