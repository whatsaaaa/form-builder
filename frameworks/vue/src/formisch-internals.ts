// The parts of Formisch's store the adapter reads that Formisch keeps out of its public API, and
// so out of semver. tests/formisch-internals.test.ts fails if a Formisch release moves them.
import type { FormStore } from '@formisch/vue'

/** The `<form>` Formisch's `<Form>` renders, which it keeps on the store for its `submit()`. */
export function formElementOf(form: FormStore): HTMLFormElement | undefined {
  return (form as unknown as { '~internal'?: { element?: HTMLFormElement } })['~internal']?.element
}
