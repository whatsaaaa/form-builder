import { getInput } from '@formisch/react'
import { describe, expect, it } from 'vitest'
import { builtInComponents, values } from './components'
import { form, mountForm, update } from './helpers'

/** A FileList of `names`, made the way a browser makes one for a drop. */
function fileList(...names: string[]): FileList {
  const transfer = new DataTransfer()
  for (const name of names) transfer.items.add(new File(['x'], name, { type: 'text/plain' }))
  return transfer.files
}

/** Calls the field's `setInput` with `input`, and gives the value the form has after it. */
async function setInput(json: ReturnType<typeof form>, path: string, input: unknown) {
  const { jsonForm } = mountForm(json, builtInComponents)
  await update(() => values.get(path)?.setInput(input))
  return (getInput(jsonForm.form) as Record<string, unknown>)[path]
}

// setInput turns the input with the schema package's coerceInput, which has its own tests. These
// check that the field's kinds reach it.
describe('setInput', () => {
  it('turns a numeric string into a number for a number field', async () => {
    expect(await setInput(form({ name: 'n', type: 'number' }), 'n', '5')).toBe(5)
    expect(await setInput(form({ name: 'n', type: 'number' }), 'n', '')).toBe(undefined)
  })

  it('keeps strings for a text field', async () => {
    expect(await setInput(form({ name: 't', type: 'text' }), 't', '5')).toBe('5')
  })

  it('turns numeric strings into numbers for a select with number options', async () => {
    const options = [
      { value: 1, label: 'One' },
      { value: 2, label: 'Two' },
    ]
    const select = form({ name: 's', type: 'select', options })
    const multiselect = form({ name: 'm', type: 'multiselect', options })

    expect(await setInput(select, 's', '2')).toBe(2)
    expect(await setInput(multiselect, 'm', ['1', '2'])).toEqual([1, 2])
  })

  it('takes the first file of a FileList for a single file field', async () => {
    const value = await setInput(form({ name: 'f', type: 'file' }), 'f', fileList('a.txt', 'b.txt'))

    expect(value).toBeInstanceOf(File)
    expect((value as File).name).toBe('a.txt')
    expect(await setInput(form({ name: 'f', type: 'file' }), 'f', fileList())).toBe(undefined)
  })

  it('takes every file of a FileList for a multiple file field', async () => {
    const json = form({ name: 'f', type: 'file', multiple: true })
    const value = (await setInput(json, 'f', fileList('a.txt', 'b.txt'))) as File[]

    expect(value.map((file) => file.name)).toEqual(['a.txt', 'b.txt'])
  })
})
