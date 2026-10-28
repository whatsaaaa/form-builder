/**
 * The built-in kinds, plus any string so consumers can register their own.
 */
export type ValueKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'file'
  | 'object'
  | 'none'
  | (string & {})
