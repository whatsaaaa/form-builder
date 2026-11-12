/// <reference types="node" />
// The byte contract between the two copies of merge-initial-input.ts: the schema package's API is
// closed, so each adapter has its own, and a rule changed in one has to change in the other.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'

const copyIn = (adapter: string) =>
  readFileSync(
    join(import.meta.dirname, '../../frameworks', adapter, 'src/merge-initial-input.ts'),
    'utf8',
  )

it('has the same merge-initial-input.ts in the Vue and React adapters', () => {
  expect(copyIn('vue')).toBe(copyIn('react'))
})
