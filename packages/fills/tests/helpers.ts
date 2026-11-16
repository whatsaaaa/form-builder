import {
  createSchemaBuilder,
  type FillsForm,
  type JsonField,
  type JsonForm,
  type OpenFillsOptions,
  type SchemaBuilder,
} from '@whatsaaaa/form-builder-schema'
import { type FillSource, fills } from '@whatsaaaa/form-builder-fills'
import profileMap from '../../../fixtures/fills/profile-map.json'
import profileSource from '../../../fixtures/fills/profile-source.json'

/** Sources for the fixtures, which answer at once. */
export const sources = {
  profiles: (value) =>
    value === 'a' ? { firstName: 'Marko', lastName: 'Petrović', 'address.city': 'Beograd' } : null,
  cities: (zip) => (zip === '11000' ? { 'address.city': 'Beograd' } : null),
} satisfies Record<string, FillSource>

/** A builder with the fixtures' sources, so their names are checked. */
export const builder = createSchemaBuilder({ extensions: [fills({ sources })] })

export const form = (...fields: JsonField[]): JsonForm => ({ version: '1', fields })

/**
 * The shared fixtures with fills. TypeScript reads `version` in a JSON file as any string, so they
 * are cast once here.
 */
export const fixtures = {
  'profile-map': profileMap,
  'profile-source': profileSource,
} as unknown as Record<'profile-map' | 'profile-source', JsonForm>

/** The issues `validate()` gives, as `code at path: message`. */
export function definitionIssues(json: unknown, by: SchemaBuilder = builder): string[] {
  return by
    .validate(json)
    .issues.map((issue) => `${issue.code} at ${issue.path.join('.')}: ${issue.message}`)
}

/** `input` with `value` at `path`, copied on the way. */
function setIn(input: unknown, path: readonly (string | number)[], value: unknown): unknown {
  const [key, ...rest] = path
  if (key === undefined) return value
  const copy = { ...(input as Record<string, unknown>) }
  copy[key] = setIn(copy[key], rest, value)
  return copy
}

/**
 * A form in memory with the fills of `json` open on it, like a renderer runs them with Formisch.
 * It starts with the builder's initial input. `log` lists each input the fills set: `set` for a
 * change, `start` for an input the form starts with.
 */
export function openForm(by: SchemaBuilder, json: JsonForm, options: OpenFillsOptions = {}) {
  let input: unknown = by.getInitialInput(json)
  const log: string[] = []
  const write = (kind: string, path: readonly (string | number)[], value: unknown) => {
    input = setIn(input, path, value)
    log.push(`${kind} ${path.join('.')} ${JSON.stringify(value) ?? 'undefined'}`)
  }
  const fillsForm: FillsForm = {
    getInput: () => input,
    setInput: (path, value) => write('set', path, value),
    setStartInput: (path, value) => write('start', path, value),
  }
  const run = by.getFills(json).open(fillsForm, options)
  return {
    run,
    log,
    get input() {
      return input as Record<string, unknown>
    },
    /** Sets a field as the user would, then tells the fills. */
    type(path: string, value: unknown) {
      input = setIn(input, path.split('.'), value)
      run.update()
    },
  }
}
