import { expect, it } from 'vitest'

// Vitest gives each test file its own modules, so the import below is this package's first.
it('loads and builds without a File global, as in SSR on old runtimes', async () => {
  const File: unknown = Reflect.get(globalThis, 'File')
  Reflect.deleteProperty(globalThis, 'File')
  try {
    const { createSchemaBuilder } = await import('@whatsaaaa/form-builder-schema')
    const { build } = createSchemaBuilder()

    expect(() =>
      build({ version: '1', fields: [{ name: 'f', type: 'file', multiple: true }] }),
    ).not.toThrow()
  } finally {
    Reflect.set(globalThis, 'File', File)
  }
})
