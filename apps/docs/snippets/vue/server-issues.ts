import { focus, getInput, setErrors } from '@formisch/vue'
import type { AnyJsonFormInstance } from '@whatsaaaa/form-builder-vue'

// #region show
/** One issue of the server's answer: a message and a field's path. */
export interface ServerIssue {
  path: (string | number)[]
  message: string
}

/** Shows the server's messages on their fields, focusing the first. */
export function showServerIssues(
  jsonForm: AnyJsonFormInstance,
  issues: ServerIssue[],
) {
  const { form } = jsonForm
  // A field takes all of its messages at once, so they go by path.
  const fields = new Map<string, string[]>()
  for (const { path, message } of issues) {
    const key = JSON.stringify(path)
    fields.set(key, [...(fields.get(key) ?? []), message])
  }
  for (const [key, errors] of fields) {
    // The paths are data, so TypeScript can't check them. Formisch
    // picks the config's type by its path, so cast the whole config.
    setErrors(form, { path: JSON.parse(key), errors } as never)
  }
  const first = issues[0]
  if (first) focus(form, { path: first.path as never })
}
// #endregion show

// #region submit
/** The submit handler: sends the input, shows what comes back. */
export async function signUp(jsonForm: AnyJsonFormInstance) {
  const response = await fetch('/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // The input, not the output: the server's parse makes the output.
    body: JSON.stringify(getInput(jsonForm.form)),
  })
  if (response.status === 422) {
    const { issues } = (await response.json()) as { issues: ServerIssue[] }
    showServerIssues(jsonForm, issues)
  }
}
// #endregion submit
