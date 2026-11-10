import { affects } from '@whatsaaaa/form-builder-affects'
import {
  createSchemaBuilder,
  type JsonForm,
} from '@whatsaaaa/form-builder-schema'
import * as v from 'valibot'

const definition = {
  version: '1',
  fields: [
    {
      name: 'email',
      type: 'email',
      required: { message: 'Please enter your email' },
    },
    { name: 'birthDate', type: 'date', output: 'date' },
    { name: 'cv', type: 'file', accept: 'application/pdf' },
  ],
} satisfies JsonForm

// #region handler
// The client's builder options: extensions, types, rules and messages.
const builder = createSchemaBuilder({ extensions: [affects()] })
const schema = builder.build(definition)

function handleSignup(body: unknown) {
  const result = v.safeParse(schema, body)
  if (!result.success) {
    // { email: ['Please enter your email'] }, by the dot path of each field
    return {
      status: 422,
      errors: v.flatten<typeof schema>(result.issues).nested,
    }
  }
  return { status: 201, output: result.output }
}
// #endregion handler

// #region missing-key
handleSignup({}) // 422, email: 'Please enter your email'
// #endregion missing-key

// #region dates
const output = v.parse(schema, {
  email: 'jane@example.com',
  birthDate: '2000-01-15',
})
// output.birthDate is a Date. JSON.stringify writes it as a timestamp,
// like "2000-01-14T23:00:00.000Z", which a `date` rejects.
const fromOutput = handleSignup(JSON.parse(JSON.stringify(output))) // 422
const fromInput = handleSignup({
  email: 'jane@example.com',
  birthDate: '2000-01-15',
}) // 201
// #endregion dates

// #region files
// In the browser: the form's input, from Formisch's getInput(form), as
// JSON in one part, and each file in a part of its own.
const formInput = {
  email: 'jane@example.com',
  cv: new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' }),
}
const { cv, ...rest } = formInput
const body = new FormData()
body.append('input', JSON.stringify(rest))
body.append('cv', cv)
const request = new Request('https://example.com/signup', {
  method: 'POST',
  body,
})

// On the server: put the files back in place, then parse.
const data = await request.formData()
const input = {
  ...JSON.parse(String(data.get('input'))),
  cv: data.get('cv') ?? undefined,
}
const withFile = handleSignup(input) // 201
// #endregion files

const missing = handleSignup({})
if (
  missing.status !== 422 ||
  JSON.stringify(missing.errors) !==
    '{"email":["Please enter your email"]}' ||
  !(output.birthDate instanceof Date) ||
  fromOutput.status !== 422 ||
  fromInput.status !== 201 ||
  withFile.status !== 201 ||
  !(withFile.output?.cv instanceof File)
)
  throw new Error('Unexpected result')
