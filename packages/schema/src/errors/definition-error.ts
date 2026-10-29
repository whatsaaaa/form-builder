/** Where something is in a definition, e.g. `['fields', 0, 'rules', 1]`. */
export type DefinitionPath = readonly (string | number)[]

/** Public API: adding a code is a minor change, renaming one is breaking, */
export type DefinitionIssueCode =
  | 'invalid_shape'
  | 'unsupported_version'
  | 'unknown_key'
  | 'unknown_type'
  | 'missing_name'
  | 'duplicate_name'
  | 'invalid_props'
  | 'unknown_rule'
  | 'unknown_param'
  | 'invalid_params'
  | 'kind_mismatch'

export interface DefinitionIssue {
  code: DefinitionIssueCode
  path: DefinitionPath
  message: string
}

export type ValidateResult =
  | { success: true; issues: [] }
  | { success: false; issues: DefinitionIssue[] }

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
