<script setup lang="ts">
import { Field, Form, useForm } from "@formisch/vue";
import * as v from "valibot";

type AnySchema = v.GenericSchema;
type AnyAction = v.PipeItem<any, any, v.BaseIssue<unknown>>;
type ValueKind = 'string' | 'number';
type FieldType = "text" | "email" | "password" | "number";

interface JsonField {
  name: string;
  type: FieldType;
  required?: boolean | { message?: string };
  rules?: readonly JsonRule[];
}

interface JsonRule {
  rule: string;
  message?: string;
  [param: string]: unknown;
}

interface JsonFormSchema {
  version: "1";
  fields: readonly JsonField[];
}

interface RuleDef<TParams extends AnySchema = AnySchema> {
  kinds: readonly ValueKind[];
  params: TParams;
  create: (params: v.InferOutput<TParams>, message?: string) => AnyAction;
}

interface FieldTypeDef {
  kind: ValueKind;
  base: (message?: string) => AnySchema;
  defaultRules?: readonly JsonRule[];
}

const defineRule = <T extends AnySchema>(def: RuleDef<T>) => def;

const nonNegInt = v.pipe(v.number(), v.integer(), v.minValue(0));
const noParams = v.object({});

const defaultRules = {
  minLength: defineRule({ kinds: ["string"], params: v.object({ value: nonNegInt }), create: (p, m) => v.minLength(p.value, m) }),
  maxLength: defineRule({ kinds: ['string'], params: v.object({ value: nonNegInt }), create: (p, m) => v.maxLength(p.value, m) }),
  regex: defineRule({
    kinds: ['string'],
    params: v.object({ pattern: v.string(), flags: v.optional(v.string()) }),
    create: (p, m) => v.regex(new RegExp(p.pattern, p.flags), m),
  }),
  email: defineRule({ kinds: ['string'], params: noParams, create: (_, m) => v.email(m) }),
  url: defineRule({ kinds: ['string'], params: noParams, create: (_, m) => v.url(m) }),
  minValue: defineRule({ kinds: ['number'], params: v.object({ value: v.number() }), create: (p, m) => v.minValue(p.value, m) }),
  maxValue: defineRule({ kinds: ['number'], params: v.object({ value: v.number() }), create: (p, m) => v.maxValue(p.value, m) }),
  integer: defineRule({ kinds: ['number'], params: noParams, create: (_, m) => v.integer(m) }),
} satisfies Record<string, RuleDef<any>>;

const defaultFieldTypes = {
  text: { kind: "string", base: (m) => v.string(m) },
  password: { kind: "string", base: (m) => v.string(m) },
  email: { kind: "string", base: (m) => v.string(m), defaultRules: [{ rule: "email", message: "Invalid email" }] }
}

const jsonSchema: JsonFormSchema = {
  version: "1",
  fields: [
    { name: "email", type: "email", required: { message: "Email is required"}, rules: [{ rule: "email", message: "That doesn't look like an email" }] },
    { name: "password", type: "password", required: true, rules: [{ rule: "minLength", value: 10, messages: "At least 10 characters"}] }
  ]
}

function createSchemaBuilder(opts: {
  fieldTypes?: Record<string, FieldTypeDef>;
  rules?: Record<string, RuleDef<any>>;
} = {}) {
  const fieldTypes: Record<string, FieldTypeDef> = { ...defaultFieldTypes, ...opts.fieldTypes };
  const rules: Record<string, RuleDef<any>> = { ...defaultRules, ...opts.rules };

  function buildAction(rule: JsonRule, kind: ValueKind, at: string): AnyAction {
    const def = rules[rule.rule];
    if (!def) throw new Error(`${at}: unknown rule "${rule.rule}"`);
    if (!def.kinds.includes(kind)) throw new Error(`${at}: rule "${rule.rule}" can't be used on ${kind} fields`);

    const parsed = v.safeParse(def.params, rule);
    if (!parsed.success) throw new Error(`${at}: invalid params for "${rule.rule}"\n${v.summarize(parsed.issues)}`);

    return def.create(parsed.output, rule.message);
  }

  function buildField(field: JsonField, i: number): AnySchema {
    const at = `fields[${i}] "${field.name}"`;
    const type = fieldTypes[field.type];
    if (!type) throw new Error(`${at}: unknown field type "${field.type}"`);

    const userRules = field.rules ?? [];
    const overridden = new Set(userRules.map((r) => r.rule));
    const allRules = [...(type.defaultRules ?? []).filter((r) => !overridden.has(r.rule)), ...userRules];

    const required = !!field.required;
    const requiredMsg = typeof field.required === "object" ? field.required.message : undefined;

    const actions: AnyAction[] = [];

    if (required && type.kind === "string") {
      actions.push(v.nonEmpty(requiredMsg ?? "Required"));
    }

    allRules.forEach((r, j) => {
      actions.push(buildAction(r, type.kind, `${at}.rules[${j}]`));
    });

    const schema = actions.reduce<AnySchema>((s, a) => v.pipe(s, a), type.base(requiredMsg));

    if (required) return schema;

    return type.kind === "string"
      ? v.optional(v.union([v.literal(''), schema]))
      : v.optional(schema);
  }

  return function build(json: JsonFormSchema) {
    const entries: v.ObjectEntries = {};

    json.fields.forEach((field, i) => {
      if (field.name in entries) throw new Error(`fields[${i}]: duplicate name "${field.name}"`);
      entries[field.name] = buildField(field, i);
    });

    return v.object(entries);
  }
}

const build = createSchemaBuilder();
const schema = build(jsonSchema);
const loginForm = useForm({ schema });
</script>

<template>
  <div class="about">
    <Form class="form" :of="loginForm" @submit="(output) => console.log(output)">
      <Field :of="loginForm" :path="['email']" v-slot="field">
        <input type="text" v-model="field.input" required />
        <span v-if="field.errors">{{ field.errors }}</span>
      </Field>

      <Field :of="loginForm" :path="['password']" v-slot="field">
        <input type="password" v-model="field.input" required />
        <span v-if="field.errors">{{ field.errors }}</span>
      </Field>

      <input type="submit" />
    </Form>
  </div>
</template>

<style>
.form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@media (min-width: 1024px) {
  .about {
    min-height: 100vh;
    display: flex;
    align-items: center;
  }
}
</style>
