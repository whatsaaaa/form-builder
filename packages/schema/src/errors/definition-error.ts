import type * as v from 'valibot'

/** Where something is in a definition, e.g. `['fields', 0, 'rules', 1]`. */
export type DefinitionPath = readonly (string | number)[]

/**
 * What kind of mistake an issue is. Codes and paths are public API, messages are not: a message
 * can change in any release. A minor version can add a code for a new kind of mistake, so handle
 * codes you don't know, e.g. with a fallback. Only a major version renames a code, or moves a
 * mistake from one code to another.
 */
export type DefinitionIssueCode =
  | 'invalid_shape'
  | 'unsupported_version'
  | 'unknown_key'
  | 'unknown_type'
  | 'missing_name'
  | 'invalid_name'
  | 'duplicate_name'
  | 'invalid_props'
  | 'invalid_default'
  | 'unknown_rule'
  | 'unknown_param'
  | 'invalid_params'
  | 'kind_mismatch'
  | 'unknown_field'
  | 'duplicate_placement'
  | 'unplaced_field'
  | 'duplicate_id'
  | 'invalid_span'
  | 'invalid_value'
  | 'cycle'

export interface DefinitionIssue {
  code: DefinitionIssueCode
  path: DefinitionPath
  message: string
}

export type ValidateResult =
  | { success: true; issues: [] }
  | { success: false; issues: DefinitionIssue[] }

export function issue(
  code: DefinitionIssueCode,
  path: DefinitionPath,
  message: string,
): DefinitionIssue {
  return { code, path, message }
}

/** Valibot's issues from parsing the part of the definition at `path`, with `code`. */
export function toIssues(
  code: DefinitionIssueCode,
  path: DefinitionPath,
  valibotIssues: readonly v.BaseIssue<unknown>[],
): DefinitionIssue[] {
  return valibotIssues.map((valibotIssue) => {
    const keys = valibotIssue.path?.map((item) => item.key as string | number) ?? []
    return issue(code, [...path, ...keys], valibotIssue.message)
  })
}

export function formatPath(path: DefinitionPath): string {
  return path.reduce<string>((out, key) => {
    if (typeof key === 'number') return `${out}[${key}]`
    return out ? `${out}.${key}` : key
  }, '')
}

/** Thrown by `build()` when the definition has issues. Lists all of them. */
export class DefinitionError extends Error {
  readonly issues: readonly DefinitionIssue[]

  constructor(issues: readonly DefinitionIssue[]) {
    const lines = issues.map(
      (issue) => `   ${formatPath(issue.path) || '(root)'}: ${issue.message}`,
    )
    super(`Invalid form definition:\n${lines.join('\n')}`)
    this.name = 'DefinitionError'
    this.issues = issues
  }
}
