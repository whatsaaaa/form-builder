import * as v from "valibot";
import type { FieldTypeDef } from "./field-type-def";

export const defaultFieldTypes = {
  text: { kind: 'string', schema: () => v.string() },
  password: { kind: 'string', schema: () => v.string() },
  email: { kind: 'string', schema: () => v.string(), defaultRules: [{ rule: 'email' }] },
  number: { kind: 'number', schema: () => v.number() },
} satisfies Record<string, FieldTypeDef>
