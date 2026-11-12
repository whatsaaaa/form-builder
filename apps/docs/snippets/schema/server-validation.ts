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
    return {
      status: 422,
      // Each message with the path of its field: ['email'], or
      // ['lines', 0, 'quantity'] for a field of a list's item.
      issues: result.issues.map((issue) => ({
        path: issue.path?.map((item) => item.key) ?? [],
        message: issue.message,
      })),
    }
  }
  return { status: 201, output: result.output }
}
// #endregion handler

// #region lang
// Valibot's messages in the language of one request.
function handleSignupIn(lang: string, body: unknown) {
  return v.safeParse(schema, body, { lang })
}
// #endregion lang

// #region missing-key
handleSignup({}) // 422, 'Please enter your email' at ['email']
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

// A message for Valibot's email check in Serbian, the way @valibot/i18n
// sets the messages of the languages it has.
v.setSpecificMessage(v.email, 'Unesite ispravnu e-adresu', 'sr')
const inSerbian = handleSignupIn('sr', { email: 'nope' })
const inEnglish = handleSignupIn('en', { email: 'nope' })
v.deleteSpecificMessage(v.email, 'sr')

const missing = handleSignup({})
if (
  missing.status !== 422 ||
  JSON.stringify(missing.issues) !==
    '[{"path":["email"],"message":"Please enter your email"}]' ||
  inSerbian.issues?.[0]?.message !== 'Unesite ispravnu e-adresu' ||
  inEnglish.issues?.[0]?.message !== 'Invalid email: Received "nope"' ||
  !(output.birthDate instanceof Date) ||
  fromOutput.status !== 422 ||
  fromInput.status !== 201 ||
  withFile.status !== 201 ||
  !(withFile.output?.cv instanceof File)
)
  throw new Error('Unexpected result')
