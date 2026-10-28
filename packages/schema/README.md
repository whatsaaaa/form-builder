# @whatsaaaa/form-builder-schema

Build [Valibot](https://valibot.dev) schemas from JSON form definitions, ready to use with [Formisch](https://formisch.dev).

## Install

```sh
pnpm add @whatsaaaa/form-builder-schema valibot
```

## Usage

```ts
import { createSchemaBuilder, type JsonFormSchema } from '@whatsaaaa/form-builder-schema'

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

Built-in field types are `text`, `email`, `password` and `number`. Empty inputs of optional `number` fields (`''` or `undefined`) produce `undefined`.

Custom field types and rules can be passed to `createSchemaBuilder({ fieldTypes, rules })`. Use `defineRule` to get typed rule params.

## License

MIT
