import { getInput } from '@formisch/react'
import {
  JsonField,
  JsonFields,
  type JsonFormInstance,
  useJsonForm,
} from '@whatsaaaa/form-builder-react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { arrays, builtInComponents, TestInput } from './components'
import {
  errorAt,
  form,
  mount,
  mountLayout,
  settle,
  submit,
  thrownBy,
  type,
  update,
} from './helpers'

const signup = form(
  { type: 'heading', text: 'Sign up' },
  { name: 'name', type: 'text' },
  { name: 'email', type: 'email', required: { message: 'Email please' } },
  {
    name: 'address',
    type: 'group',
    fields: [
      { name: 'street', type: 'text' },
      { name: 'city', type: 'text' },
    ],
  },
  {
    name: 'lines',
    type: 'array',
    fields: [
      { name: 'product', type: 'text' },
      { name: 'qty', type: 'number', default: 1 },
    ],
  },
  { name: 'newsletter', type: 'checkbox' },
)

const options = { components: builtInComponents }

/** The paths of the fields rendered inside `selector`, in document order. */
const pathsIn = (root: HTMLElement, selector: string) =>
  [...root.querySelectorAll<HTMLElement>(`${selector} [data-path]`)].map(
    (element) => element.dataset.path,
  )

/** Mounts a component that renders `<JsonField>` with these props, and gives what it threw. */
function placedThrows(path: string) {
  function App() {
    const jsonForm = useJsonForm(signup, options)
    return <JsonField of={jsonForm} path={path} />
  }
  return thrownBy(<App />)
}

/** Mounts a component that renders `<JsonFields>` with these props, and gives what it threw. */
function fieldsThrow(props: { only?: string[]; except?: string[] }) {
  function App() {
    const jsonForm = useJsonForm(signup, options)
    return <JsonFields of={jsonForm} {...props} />
  }
  return thrownBy(<App />)
}

describe('placing fields', () => {
  it('renders a field with <JsonField> wherever it is, and leaves it out of <JsonFields>', () => {
    const { root } = mountLayout(
      signup,
      (jsonForm) => (
        <>
          <main>
            <JsonFields of={jsonForm} except={['email', 'newsletter']} />
          </main>
          <aside>
            <JsonField of={jsonForm} path="newsletter" />
            <JsonField of={jsonForm} path="email" />
          </aside>
        </>
      ),
      options,
    )

    expect(pathsIn(root, 'main')).toEqual([
      'name',
      'address',
      'address.street',
      'address.city',
      'lines',
    ])
    expect(pathsIn(root, 'aside')).toEqual(['newsletter', 'email'])
  })

  it('types, validates and submits a placed field like any other', async () => {
    const { root, jsonForm, submitted } = mountLayout(
      signup,
      (instance) => (
        <>
          <main>
            <JsonFields of={instance} except={['email']} />
          </main>
          <aside>
            <JsonField of={instance} path="email" />
          </aside>
        </>
      ),
      options,
    )
    await submit(root)
    expect(errorAt(root, 'email')).toBe('Email please')

    type(root, 'email', 'ana@example.com')
    await submit(root)
    expect(getInput(jsonForm.form)).toMatchObject({ email: 'ana@example.com' })
    expect(submitted).toEqual([{ email: 'ana@example.com', address: {}, lines: [] }])
  })

  it('places a group or an array with the fields inside it', async () => {
    const { root } = mountLayout(
      signup,
      (jsonForm) => (
        <>
          <section className="group">
            <JsonField of={jsonForm} path="address" />
          </section>
          <section className="array">
            <JsonField of={jsonForm} path="lines" />
          </section>
        </>
      ),
      options,
    )
    await update(() => arrays.get('lines')?.add())

    expect(pathsIn(root, '.group')).toEqual(['address', 'address.street', 'address.city'])
    expect(pathsIn(root, '.array')).toEqual(['lines', 'lines.0.product', 'lines.0.qty'])
  })

  it('places a field of a group on its own, and leaves it out of its group', () => {
    const { root } = mountLayout(
      signup,
      (jsonForm) => (
        <>
          <main>
            <JsonFields of={jsonForm} except={['address.city']} />
          </main>
          <aside>
            <JsonField of={jsonForm} path="address.city" />
          </aside>
        </>
      ),
      options,
    )

    expect(pathsIn(root, 'main')).toContain('address.street')
    expect(pathsIn(root, 'main')).not.toContain('address.city')
    expect(pathsIn(root, 'aside')).toEqual(['address.city'])
  })

  it("leaves a field out of every item of an array with '*' in its path", async () => {
    const { root } = mountLayout(
      signup,
      (jsonForm) => <JsonFields of={jsonForm} only={['lines']} except={['lines.*.qty']} />,
      options,
    )
    await update(() => {
      arrays.get('lines')?.add()
      arrays.get('lines')?.add()
    })

    expect(pathsIn(root, 'form')).toEqual(['lines', 'lines.0.product', 'lines.1.product'])
  })

  it('renders only the fields `only` names, in the order of the definition', () => {
    const { root } = mountLayout(
      signup,
      (jsonForm) => <JsonFields of={jsonForm} only={['newsletter', 'name', 'address.city']} />,
      options,
    )

    expect(pathsIn(root, 'form')).toEqual(['name', 'address.city', 'newsletter'])
    expect(root.querySelector('[data-role="display"]')).toBe(null)
  })

  it('follows `only` and `except` when they change, and keeps what a hidden field had', async () => {
    let setExcept: (except: string[]) => void = () => {}
    function Layout({ of }: { of: JsonFormInstance }) {
      const [except, set] = useState<string[]>([])
      setExcept = set
      return <JsonFields of={of} except={except} />
    }
    const { root, jsonForm } = mountLayout(signup, (form) => <Layout of={form} />, options)
    type(root, 'email', 'ana@example.com')

    await update(() => setExcept(['email']))
    expect(pathsIn(root, 'form')).not.toContain('email')
    expect(getInput(jsonForm.form)).toMatchObject({ email: 'ana@example.com' })

    await update(() => setExcept([]))
    expect(root.querySelector<HTMLInputElement>('[data-path="email"] input')?.value).toBe(
      'ana@example.com',
    )
  })

  it('throws a TypeError for a path that names no field', () => {
    const placed = placedThrows('emial')
    const excepted = fieldsThrow({ except: ['emial'] })

    expect(placed).toBeInstanceOf(TypeError)
    expect((placed as Error).message).toBe('No field at "emial" in the definition.')
    expect((excepted as Error).message).toBe('No field at "emial" in the definition.')
  })

  it("throws a TypeError for a field of an array's items placed on its own", () => {
    const placed = placedThrows('lines.*.qty')
    const only = fieldsThrow({ only: ['lines.*.qty'] })

    expect((placed as Error).message).toBe(
      `"lines.*.qty" is in an array's items, so it can't be placed on its own. Place "lines" instead.`,
    )
    expect(only).toBeInstanceOf(TypeError)
  })

  it('takes components from the props over the ones useJsonForm got', () => {
    const Custom = () => <b data-custom="" />
    const { root } = mountLayout(
      signup,
      (jsonForm) => <JsonField of={jsonForm} path="name" components={{ text: Custom }} />,
      options,
    )

    expect(root.querySelector('[data-custom]')).not.toBe(null)
  })

  it('throws a TypeError when there are no components at all', () => {
    function App() {
      return <JsonFields of={useJsonForm(signup)} />
    }

    expect((thrownBy(<App />) as Error).message).toBe(
      'No field components. Pass them to useJsonForm, or to the component.',
    )
  })

  it('checks only the components of the fields it renders', async () => {
    function App() {
      const jsonForm = useJsonForm(signup)
      return <JsonField of={jsonForm} path="name" components={{ text: TestInput }} />
    }
    const root = mount(<App />)
    await settle()

    expect(pathsIn(root, '')).toEqual(['name'])
  })
})
