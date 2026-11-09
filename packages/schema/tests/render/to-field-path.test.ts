import { describe, expect, it } from 'vitest'
import { toFieldPath } from '@whatsaaaa/form-builder-schema'

describe('toFieldPath', () => {
  it("replaces each '*' with the index of the item it is in, outermost first", () => {
    expect(toFieldPath(['lines', '*', 'qty'], [2])).toEqual(['lines', 2, 'qty'])
    expect(toFieldPath(['orders', '*', 'lines', '*'], [0, 3])).toEqual(['orders', 0, 'lines', 3])
  })

  it("keeps a path without '*' as it is", () => {
    expect(toFieldPath(['address', 'city'], [])).toEqual(['address', 'city'])
    expect(toFieldPath([], [])).toEqual([])
  })

  it('ignores indexes the path has no use for, like those of the arrays around a group', () => {
    expect(toFieldPath(['lines', '*', 'qty'], [1, 4])).toEqual(['lines', 1, 'qty'])
  })

  it("throws a TypeError for a '*' without an index", () => {
    const path = () => toFieldPath(['orders', '*', 'lines', '*'], [1])

    expect(path).toThrow(TypeError)
    expect(path).toThrow(
      `"orders.*.lines.*" needs the index of each array item it is in, one per '*'. Got [1].`,
    )
  })
})
