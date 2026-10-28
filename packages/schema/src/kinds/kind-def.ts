import type { AnyAction } from "../shared/valibot-types"

export interface KindDef {
  /** True when the input means "no value". */
  isEmpty(input: unknown): boolean
  /** Extra check for required fieldsd after normalize rules ran. Omit it when isEmpty is enough. */
  required?(message: string): AnyAction | null
}
