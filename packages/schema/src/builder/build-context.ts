import { DefinitionError, type DefinitionIssue } from '../errors/definition-error'
import type { BuildContext } from '../field-types/field-type-def'
import type { Messages } from './build-field-schema'
import { type Compiler, createCompiler } from './compile-definition'
import { mergeRegistry } from './registry'

const messages: Messages = { required: 'Required', resolve: (text) => text }

/**
 * A build context for testing a field type on its own, without a definition around it.
 * `buildFields` and `buildField` use the default registries and throw a `DefinitionError` when
 * the child fields have issues. `overrides` replaces any member, e.g. `path`.
 */
export function createBuildContext(overrides: Partial<BuildContext> = {}): BuildContext {
  const registry = mergeRegistry({})

  const run = <T>(compile: (compiler: Compiler) => T): T => {
    const issues: DefinitionIssue[] = []
    const result = compile(createCompiler(registry, messages, issues))
    if (issues.length) throw new DefinitionError(issues)
    return result
  }

  return {
    path: [],
    buildFields: (fields, path) => run((compiler) => compiler.fields(fields, path)),
    buildField: (field, path) => run((compiler) => compiler.field(field, path)),
    ...overrides,
  }
}
