import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { expect, it } from 'vitest'
import { fixtures } from './fixtures'
import { type DotPath, type FileSpec, scenarios, type Step } from './scenarios'

/**
 * A fixture rendered by a binding's test, the way an app renders a form. The renderer marks its
 * elements so every binding is driven the same way:
 *
 * - each input, select and textarea has Formisch's `name` from `field.props`
 * - each radio button and checkbox of a group is in a `<label>` with the option's label
 * - each `<option>` has the option's label as its text
 * - a field shows its first error in a `<small data-error="lines.0.product">`
 * - a list has a `<button data-add="lines">`, and one `<button data-remove="lines.0">` per item
 * - it renders the current step of the layout, with a `<button data-next>` when a step follows,
 *   and a `<button data-back>` when one comes before
 * - each cell of a row has its span in `data-span`
 * - a slot named `shipping` or `submit` holds an element with `data-slot` set to its name
 */
export interface RenderedForm {
  root: HTMLElement
  /** Every output the form submitted. */
  submitted: unknown[]
  /** Runs `change`, then waits until Formisch has validated and the binding has rendered. */
  update(change: () => void): Promise<void>
}

/** Runs every scenario on forms from `render`, which may wait for the form to render. */
export function runScenarios(render: (json: JsonForm) => RenderedForm | Promise<RenderedForm>) {
  it.each(scenarios)('$fixture: $name', async (scenario) => {
    const form = await render(fixtures[scenario.fixture])
    for (const step of scenario.steps) await form.update(() => perform(form.root, step))

    expect(errorsIn(form.root)).toEqual(scenario.errors ?? {})
    expect(form.submitted).toEqual(scenario.output ? [scenario.output] : [])
    for (const [path, value] of Object.entries(scenario.values ?? {})) {
      expect(controlAt(form.root, path).value, path).toBe(value)
    }
    if (scenario.shown) expect(shownIn(form.root)).toEqual(scenario.shown)
    for (const [path, span] of Object.entries(scenario.spans ?? {})) {
      const cell = controlAt(form.root, path).closest<HTMLElement>('[data-span]')
      expect(cell?.dataset['span'], path).toBe(String(span))
    }
    if (scenario.slots) {
      const slots = [...form.root.querySelectorAll<HTMLElement>('[data-slot]')]
      expect(slots.map((slot) => slot.dataset['slot'])).toEqual(scenario.slots)
    }
  })
}

function perform(root: HTMLElement, step: Step): void {
  switch (step.do) {
    case 'fill':
      return fill(controlAt(root, step.path) as HTMLInputElement | HTMLTextAreaElement, step.text)
    case 'check':
      return (
        step.option === undefined
          ? controlAt(root, step.path)
          : optionAt(root, step.path, step.option)
      ).click()
    case 'choose':
      return choose(controlAt(root, step.path) as HTMLSelectElement, step.options)
    case 'upload':
      return upload(controlAt(root, step.path) as HTMLInputElement, step.files)
    case 'add':
      return buttonFor(root, 'add', step.path).click()
    case 'remove':
      return buttonFor(root, 'remove', `${step.path}.${step.index}`).click()
    case 'next':
    case 'back':
      return buttonFor(root, step.do).click()
    case 'submit':
      root
        .querySelector('form')
        ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  }
}

/** Formisch's name for the field at `path`: `'["lines",0,"product"]'`. */
const nameOf = (path: DotPath) =>
  JSON.stringify(path.split('.').map((key) => (/^\d+$/.test(key) ? Number(key) : key)))

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

const controlsAt = (root: HTMLElement, path: DotPath) =>
  [...root.querySelectorAll<Control>('input, select, textarea')].filter(
    (element) => element.name === nameOf(path),
  )

function controlAt(root: HTMLElement, path: DotPath): Control {
  const [control] = controlsAt(root, path)
  if (!control) throw new Error(`No input at ${path}`)
  return control
}

function optionAt(root: HTMLElement, path: DotPath, label: string): Control {
  const option = controlsAt(root, path).find(
    (element) => element.closest('label')?.textContent?.trim() === label,
  )
  if (!option) throw new Error(`No option "${label}" at ${path}`)
  return option
}

function buttonFor(
  root: HTMLElement,
  action: 'add' | 'remove' | 'next' | 'back',
  path = '',
): HTMLElement {
  const button = [...root.querySelectorAll<HTMLElement>(`[data-${action}]`)].find(
    (element) => element.dataset[action] === path,
  )
  if (!button) throw new Error(`No ${action} button${path && ` for ${path}`}`)
  return button
}

/** The path of each field on show, in order: each control's, once. */
const shownIn = (root: HTMLElement) => [
  ...new Set(
    [...root.querySelectorAll<Control>('input, select, textarea')].map((element) =>
      (JSON.parse(element.name) as (string | number)[]).join('.'),
    ),
  ),
]

/** Types like a person: through the value setter React watches, then the events a browser fires. */
function fill(element: HTMLInputElement | HTMLTextAreaElement, text: string): void {
  Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')?.set?.call(element, text)
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
}

function choose(select: HTMLSelectElement, labels: readonly string[]): void {
  for (const option of select.options) option.selected = labels.includes(option.text)
  select.dispatchEvent(new Event('input', { bubbles: true }))
  select.dispatchEvent(new Event('change', { bubbles: true }))
}

/** jsdom can't make a FileList, so an array of the files stands in for one, as in Testing Library. */
function upload(input: HTMLInputElement, files: readonly FileSpec[]): void {
  const list = files.map(({ name, type, size }) => new File([new Uint8Array(size)], name, { type }))
  Object.defineProperty(input, 'files', { configurable: true, value: list })
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

/** The error each field shows, by its path. */
const errorsIn = (root: HTMLElement) =>
  Object.fromEntries(
    [...root.querySelectorAll<HTMLElement>('[data-error]')].map((element) => [
      element.dataset['error'],
      element.textContent,
    ]),
  )
