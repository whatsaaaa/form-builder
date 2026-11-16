/**
 * True when the app's initial input `given` has a value for the field at `path`: every key on the
 * way is there, with any value, the way the adapters merge it over the defaults. A group given
 * anything but an object starts with every field blank, so its fields count as given too.
 */
export function isGiven(given: unknown, path: readonly string[]): boolean {
  if (!isRecord(given)) return false
  let at: unknown = given
  for (const key of path) {
    if (!isRecord(at)) return true
    if (!Object.hasOwn(at, key)) return false
    at = at[key]
  }
  return true
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
