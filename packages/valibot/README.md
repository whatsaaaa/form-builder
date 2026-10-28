# @whatsaaaa/form-builder-valibot

Build [Valibot](https://valibot.dev) schemas from JSON form definitions.

## Install

```sh
pnpm add @whatsaaaa/form-builder-valibot valibot
```

## Usage

```ts
import { createSchemaBuilder, type JsonFormSchema } from '@whatsaaaa/form-builder-valibot'

const json: JsonFormSchema = {
  version: '1',
  fields: [
    { name: 'email', type: 'email', required: { message: 'Email is required' } },
    {
      name: 'password',
      type: 'password',
      required: true,
      rules: [{ rule: 'minLength', value: 10, message: 'At least 10 characters' }],
    },
  ],
}

const build = createSchemaBuilder()
const schema = build(json) // v.ObjectSchema, ready for Formisch or v.parse
```

Custom field types and rules can be passed to `createSchemaBuilder({ fieldTypes, rules })`. Use `defineRule` to get typed rule params.

## License

MIT
