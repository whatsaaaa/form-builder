import {
  createForm,
  focus,
  Form,
  type FormStore,
  getInput,
  insert,
  remove,
  setErrors,
  setInput,
  type SubmitHandler,
  useField,
  useFieldArray,
  validate,
} from '@formisch/solid'
import { affects } from '@whatsaaaa/form-builder-affects'
import {
  coerceInput,
  createSchemaBuilder,
  type FieldNode,
  fieldPathsOf,
  isRequired,
  issuesOfStep,
  type JsonForm,
  type JsonFormSchema,
  type LayoutField,
  type LayoutNode,
  type LayoutStep,
  toFieldPath,
  type VisibilityState,
} from '@whatsaaaa/form-builder-schema'
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  type JSX,
  Match,
  on,
  Show,
  Switch,
} from 'solid-js'
import { Dynamic } from 'solid-js/web'

// With affects, the fields' conditions hide them: the schema doesn't validate them, and the view
// leaves them out.
const builder = createSchemaBuilder({ extensions: [affects()] })

/** The content of the layout's slots, by name. */
type Slots = Record<string, JSX.Element>

interface JsonFormViewProps {
  json: JsonForm
  onSubmit: SubmitHandler<JsonFormSchema>
  slots?: Slots
}

export function JsonFormView(props: JsonFormViewProps) {
  // A component runs once, so the definition is read once.
  const form = createForm({
    schema: builder.build(props.json),
    initialInput: builder.getInitialInput(props.json),
  })
  const { steps } = builder.getLayout(props.json)
  const conditions = builder.getVisibility(props.json)
  // What the conditions hide for the input now: the same object until that changes.
  const visibility = createMemo(() => conditions.of(getInput(form)))
  // The fields the conditions clear, set blank as soon as they are cleared.
  createEffect(
    on(visibility, (state) => {
      for (const { path, input } of state.toClear) setInput(form, { path, input } as never)
    }),
  )
  const [index, setIndex] = createSignal(0)
  const step = () => steps[index()] as LayoutStep
  // A step whose fields are all hidden is skipped. The current one stays, while the user is on it.
  const shown = createMemo(() =>
    steps.flatMap((each, i) => (i === index() || !visibility().isStepHidden(each) ? [i] : [])),
  )
  const before = () => shown()[shown().indexOf(index()) - 1]
  const after = () => shown()[shown().indexOf(index()) + 1]

  // Next validates the whole form, and only the issues on this step's fields keep the user here.
  const next = async () => {
    const found = issuesOfStep(step(), (await validate(form)).issues)
    if (found.length) {
      const first = found.find((issue) => issue.field.role === 'value')
      if (first) focus(form, { path: first.path as never })
      return
    }
    const to = after()
    if (to === undefined) return
    // That validation set errors on the next step's fields too, which nobody saw.
    for (const path of fieldPathsOf(steps[to] as LayoutStep, getInput(form))) {
      setErrors(form, { path, errors: null } as never)
    }
    setIndex(to)
  }

  return (
    <Form of={form} onSubmit={(output) => props.onSubmit(output)}>
      {/* Keyed by the step, so its fields render anew when it changes. */}
      <Show when={step()} keyed>
        {(current) => (
          <Layout
            form={form}
            visibility={visibility}
            nodes={current.children}
            indexes={[]}
            slots={props.slots ?? {}}
          />
        )}
      </Show>
      <Show when={before() !== undefined}>
        <button type="button" data-back="" onClick={() => setIndex(before() as number)}>
          Back
        </button>
      </Show>
      <Show when={after() !== undefined} fallback={<button type="submit">Save</button>}>
        <button type="button" data-next="" onClick={next}>
          Next
        </button>
      </Show>
    </Form>
  )
}

interface LayoutProps {
  form: FormStore
  /** What the conditions hide now. */
  visibility: () => VisibilityState
  nodes: readonly LayoutNode[]
  /** The index of each array item the nodes are in, outermost first. */
  indexes: readonly number[]
  slots: Slots
}

/**
 * The keys of the nodes the conditions show. The nodes stay the ones written, so `<For>` keeps the
 * element of each as others show and hide.
 */
const shownKeys = (props: Pick<LayoutProps, 'visibility' | 'nodes' | 'indexes'>) =>
  new Set(
    props
      .visibility()
      .shownNodes(props.nodes, props.indexes)
      .map((node) => node.key),
  )

function Layout(props: LayoutProps) {
  const shown = createMemo(() => shownKeys(props))
  return (
    <For each={props.nodes}>
      {(node) => (
        <Show when={shown().has(node.key)}>
          <Node {...props} node={node} />
        </Show>
      )}
    </For>
  )
}

function Node(props: Omit<LayoutProps, 'nodes'> & { node: LayoutNode }) {
  const node = props.node
  return (
    <Switch>
      <Match when={node.type === 'section' && node}>
        {(section) => (
          <fieldset>
            <legend>{section().section.label}</legend>
            <Layout {...props} nodes={section().children} />
          </fieldset>
        )}
      </Match>
      <Match when={node.type === 'row' && node}>
        {(row) => {
          const cells = createMemo(() => shownKeys({ ...props, nodes: row().children }))
          return (
            // One line of a 12-column grid, where each cell takes its span. A hidden cell drops
            // out, and the others line up from the first column.
            <div style={{ display: 'grid', 'grid-template-columns': 'repeat(12, 1fr)' }}>
              <For each={row().children}>
                {(cell) => (
                  <Show when={cells().has(cell.key)}>
                    <div data-span={cell.span} style={{ 'grid-column': `span ${cell.span}` }}>
                      <Node {...props} node={cell} />
                    </div>
                  </Show>
                )}
              </For>
            </div>
          )
        }}
      </Match>
      <Match when={node.type === 'slot' && node}>{(slot) => props.slots[slot().name]}</Match>
      <Match when={node.type === 'field' && node}>
        {(field) => <Field {...props} node={field()} />}
      </Match>
    </Switch>
  )
}

/** A field by its role. A group and an array render their fields from the layout. */
function Field(props: Omit<LayoutProps, 'nodes'> & { node: LayoutField }) {
  const node = () => props.node.node
  return (
    <Switch>
      <Match when={node().role === 'display'}>
        <Display node={node()} />
      </Match>
      <Match when={node().role === 'group'}>
        <fieldset>
          <legend>{node().field.label ?? node().field.name}</legend>
          <Layout
            form={props.form}
            visibility={props.visibility}
            nodes={props.node.children}
            indexes={props.indexes}
            slots={props.slots}
          />
        </fieldset>
      </Match>
      <Match when={node().role === 'array'}>
        <ArrayField
          form={props.form}
          visibility={props.visibility}
          node={props.node}
          indexes={props.indexes}
        />
      </Match>
      <Match when={node().role === 'value'}>
        <ValueField form={props.form} node={node()} indexes={props.indexes} />
      </Match>
    </Switch>
  )
}

function Display(props: { node: FieldNode }) {
  const text = () => String(props.node.field.text ?? '')
  return (
    <Switch fallback={<hr />}>
      <Match when={props.node.type === 'heading'}>
        <Dynamic component={`h${Number(props.node.field.level ?? 2)}`}>{text()}</Dynamic>
      </Match>
      <Match when={props.node.type === 'paragraph'}>
        <p>{text()}</p>
      </Match>
    </Switch>
  )
}

/** A list: Formisch's field array, and the layout of each item. A slot never is in one. */
function ArrayField(props: Omit<LayoutProps, 'nodes' | 'slots'> & { node: LayoutField }) {
  // A getter, so the path follows the item when one before it is removed. It comes from the
  // definition at runtime, so Formisch's types can't check it.
  const path = () => toFieldPath(props.node.node.dataPath, props.indexes)
  const array = useFieldArray(props.form, () => ({ path: path() as never }))
  const add = () =>
    insert(props.form, {
      path: path() as never,
      initialInput: builder.getItemInput(props.node.node.field) as never,
    })
  return (
    <fieldset>
      <legend>{props.node.node.field.label ?? props.node.node.field.name}</legend>
      <For each={array.items}>
        {(_, index) => (
          <div>
            {/* Each item hides its own fields, by the fields of the item. */}
            <Layout
              form={props.form}
              visibility={props.visibility}
              nodes={props.node.children}
              indexes={[...props.indexes, index()]}
              slots={{}}
            />
            <button
              type="button"
              data-remove={`${path().join('.')}.${index()}`}
              onClick={() => remove(props.form, { path: path() as never, at: index() })}
            >
              Remove
            </button>
          </div>
        )}
      </For>
      <button type="button" data-add={path().join('.')} onClick={add}>
        Add
      </button>
      <Show when={array.errors}>
        {(errors) => <small data-error={path().join('.')}>{errors()[0]}</small>}
      </Show>
    </fieldset>
  )
}

type Option = { value: string | number | boolean; label: string }

/** The `<input>` type of each field type that has one of its own. Any other type is text. */
const inputTypes: Record<string, string> = {
  email: 'email',
  password: 'password',
  url: 'url',
  tel: 'tel',
  number: 'number',
  date: 'date',
  time: 'time',
  datetime: 'datetime-local',
}

function ValueField(props: { form: FormStore; node: FieldNode; indexes: readonly number[] }) {
  const path = () => toFieldPath(props.node.dataPath, props.indexes)
  const field = useField(props.form, () => ({ path: path() as never }))
  // Turns what the element gives into the field's value, e.g. '5' into 5 for a number.
  const set = (input: unknown) => field.onInput(coerceInput(input, props.node) as never)
  const input = () => field.input as unknown
  const picked = () => (Array.isArray(input()) ? (input() as unknown[]) : [])
  // A field keeps its type, so the control is picked once.
  const { field: json, type, kind } = props.node
  const options = (json.options ?? []) as Option[]
  const label = (
    <span>
      {json.label ?? json.name}
      {isRequired(json) && ' *'}
    </span>
  )
  const error = (
    <Show when={field.errors}>
      {(errors) => <small data-error={path().join('.')}>{errors()[0]}</small>}
    </Show>
  )

  // Radio buttons and checkboxes set their option's own value, so 2 stays a number.
  if (type === 'radio' || (type === 'multiselect' && json.ui?.widget === 'checkboxes')) {
    const radio = type === 'radio'
    return (
      <fieldset>
        <legend>{label}</legend>
        <For each={options}>
          {(option) => (
            <label>
              <input
                {...field.props}
                type={radio ? 'radio' : 'checkbox'}
                checked={radio ? input() === option.value : picked().includes(option.value)}
                onInput={(e) =>
                  set(
                    radio
                      ? option.value
                      : e.currentTarget.checked
                        ? [...picked(), option.value]
                        : picked().filter((value) => value !== option.value),
                  )
                }
              />
              {option.label}
            </label>
          )}
        </For>
        {error}
      </fieldset>
    )
  }

  let control: JSX.Element
  if (type === 'checkbox') {
    control = (
      <input
        {...field.props}
        type="checkbox"
        checked={input() === true}
        onInput={(e) => set(e.currentTarget.checked)}
      />
    )
  } else if (options.length) {
    // A select's value is the option's index, and the option sets its own value.
    const multiple = kind === 'array'
    control = (
      <select
        {...field.props}
        multiple={multiple}
        onInput={(e) => {
          const values = [...e.currentTarget.selectedOptions].map(
            (element) => options[Number(element.value)]?.value,
          )
          set(multiple ? values : values[0])
        }}
      >
        <Show when={!multiple}>
          <option value={-1}>Choose…</option>
        </Show>
        <For each={options}>
          {(option, i) => (
            <option
              value={i()}
              selected={multiple ? picked().includes(option.value) : input() === option.value}
            >
              {option.label}
            </option>
          )}
        </For>
      </select>
    )
  } else if (type === 'file') {
    // Never set a file input's value. It gives a FileList, which coerceInput reads.
    control = (
      <input
        {...field.props}
        type="file"
        multiple={kind === 'array'}
        accept={json.accept as string | undefined}
        onInput={(e) => set(e.currentTarget.files)}
      />
    )
  } else if (type === 'textarea') {
    control = (
      <textarea
        {...field.props}
        value={(input() as string | undefined) ?? ''}
        onInput={(e) => set(e.currentTarget.value)}
      />
    )
  } else {
    control = (
      <input
        {...field.props}
        type={inputTypes[type] ?? 'text'}
        value={(input() as string | number | undefined) ?? ''}
        placeholder={json.placeholder}
        onInput={(e) => set(e.currentTarget.value)}
      />
    )
  }

  return (
    <label>
      {label}
      {control}
      {error}
    </label>
  )
}
