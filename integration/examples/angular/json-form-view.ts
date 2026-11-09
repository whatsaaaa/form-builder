import { NgTemplateOutlet } from '@angular/common'
import {
  Component,
  computed,
  effect,
  forwardRef,
  inject,
  Injector,
  input,
  type OnInit,
  output,
  runInInjectionContext,
  signal,
  type TemplateRef,
  untracked,
} from '@angular/core'
import {
  focus,
  FormischControl,
  FormischForm,
  type FormStore,
  getInput,
  injectField,
  injectFieldArray,
  injectForm,
  insert,
  remove,
  setErrors,
  setInput,
  validate,
} from '@formisch/angular'
import { affects } from '@whatsaaaa/form-builder-affects'
import {
  coerceInput,
  createSchemaBuilder,
  type FieldNode,
  fieldPathsOf,
  isRequired,
  issuesOfStep,
  type JsonForm,
  type LayoutField,
  type LayoutNode,
  type LayoutStep,
  toFieldPath,
  type Visibility,
  type VisibilityState,
} from '@whatsaaaa/form-builder-schema'

// With affects, the fields' conditions hide them: the schema doesn't validate them, and the view
// leaves them out.
const builder = createSchemaBuilder({ extensions: [affects()] })

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

/**
 * A field with a value. `[formischControl]` reads and writes the element when its value is the
 * field's: text, a checkbox, files. A number, and an option's own value, are set with `setInput`.
 */
@Component({
  selector: 'json-value-field',
  imports: [FormischControl, NgTemplateOutlet],
  template: `
    <ng-template #label>
      <span>{{ node().field.label ?? node().field.name }}{{ required() ? ' *' : '' }}</span>
    </ng-template>
    <ng-template #error>
      @if (field.errors(); as errors) {
        <small [attr.data-error]="path().join('.')">{{ errors[0] }}</small>
      }
    </ng-template>

    @switch (control()) {
      @case ('radio') {
        <fieldset>
          <legend><ng-container [ngTemplateOutlet]="label" /></legend>
          @for (option of options(); track option.value) {
            <label>
              <input
                type="radio"
                [attr.name]="field.name()"
                [checked]="input() === option.value"
                (input)="set(option.value)"
              />
              {{ option.label }}
            </label>
          }
          <ng-container [ngTemplateOutlet]="error" />
        </fieldset>
      }
      @case ('checkboxes') {
        <fieldset>
          <legend><ng-container [ngTemplateOutlet]="label" /></legend>
          @for (option of options(); track option.value) {
            <label>
              <input
                type="checkbox"
                [attr.name]="field.name()"
                [checked]="picked().includes(option.value)"
                (input)="toggle(option, $any($event.target).checked)"
              />
              {{ option.label }}
            </label>
          }
          <ng-container [ngTemplateOutlet]="error" />
        </fieldset>
      }
      @default {
        <label>
          <ng-container [ngTemplateOutlet]="label" />
          @switch (control()) {
            @case ('checkbox') {
              <input [formischControl]="field" type="checkbox" />
            }
            @case ('select') {
              <select
                [attr.name]="field.name()"
                [multiple]="multiple()"
                (input)="choose($any($event.target))"
              >
                @if (!multiple()) {
                  <option value="-1">Choose…</option>
                }
                @for (option of options(); track option.value; let i = $index) {
                  <option [value]="i" [selected]="isPicked(option)">{{ option.label }}</option>
                }
              </select>
            }
            @case ('file') {
              <input
                [formischControl]="field"
                type="file"
                [multiple]="multiple()"
                [attr.accept]="node().field['accept']"
              />
            }
            @case ('textarea') {
              <textarea [formischControl]="field"></textarea>
            }
            @case ('number') {
              <input
                type="number"
                [attr.name]="field.name()"
                [value]="input() ?? ''"
                [attr.placeholder]="node().field.placeholder"
                (input)="set($any($event.target).value)"
              />
            }
            @default {
              <input
                [formischControl]="field"
                [type]="inputType()"
                [attr.placeholder]="node().field.placeholder"
              />
            }
          }
          <ng-container [ngTemplateOutlet]="error" />
        </label>
      }
    }
  `,
})
export class ValueField {
  readonly form = input.required<FormStore>()
  readonly node = input.required<FieldNode>()
  /** The index of each array item the field is in, outermost first. */
  readonly indexes = input.required<readonly number[]>()

  protected readonly path = computed(() => toFieldPath(this.node().dataPath, this.indexes()))
  // A signal, so the field follows its item when one before it is removed. The path comes from
  // the definition at runtime, so Formisch's types can't check it.
  protected readonly field = injectField(this.form, { path: this.path as never })

  protected readonly input = computed((): unknown => this.field.input())
  protected readonly required = computed(() => isRequired(this.node().field))
  protected readonly options = computed(() => (this.node().field['options'] ?? []) as Option[])
  protected readonly multiple = computed(() => this.node().kind === 'array')
  protected readonly picked = computed(() => {
    const input = this.input()
    return Array.isArray(input) ? (input as unknown[]) : []
  })
  protected readonly inputType = computed(() => inputTypes[this.node().type] ?? 'text')

  /** Which control the field gets, by its type and kind. */
  protected readonly control = computed(() => {
    const { type, kind, field } = this.node()
    if (type === 'radio') return 'radio'
    if (type === 'multiselect' && field.ui?.['widget'] === 'checkboxes') return 'checkboxes'
    if (type === 'checkbox' || type === 'file' || type === 'textarea') return type
    if (this.options().length) return 'select'
    return kind === 'number' ? 'number' : 'input'
  })

  /** Turns what the element gives into the field's value, e.g. '5' into 5 for a number. */
  protected set(input: unknown): void {
    this.field.setInput(coerceInput(input, this.node()) as never)
  }

  /** A checkbox of a multiselect adds its option's value, or takes it out. */
  protected toggle(option: Option, checked: boolean): void {
    const picked = this.picked()
    this.set(checked ? [...picked, option.value] : picked.filter((value) => value !== option.value))
  }

  /** A select's value is the option's index, and the option sets its own value. */
  protected choose(select: HTMLSelectElement): void {
    const values = [...select.selectedOptions].map(
      (element) => this.options()[Number(element.value)]?.value,
    )
    this.set(this.multiple() ? values : values[0])
  }

  protected isPicked(option: Option): boolean {
    return this.multiple() ? this.picked().includes(option.value) : this.input() === option.value
  }
}

/** A list: Formisch's field array, and the layout of each item. A slot never is in one. */
@Component({
  selector: 'json-array-field',
  imports: [forwardRef(() => JsonLayout)],
  template: `
    <fieldset>
      <legend>{{ field().label ?? field().name }}</legend>
      @for (item of array.items(); track item; let index = $index) {
        <div>
          <!-- Each item hides its own fields, by the fields of the item. -->
          <json-layout
            [form]="form()"
            [visibility]="visibility()"
            [nodes]="node().children"
            [indexes]="[...indexes(), index]"
            [slots]="{}"
          />
          <button
            type="button"
            [attr.data-remove]="dotPath() + '.' + index"
            (click)="remove(index)"
          >
            Remove
          </button>
        </div>
      }
      <button type="button" [attr.data-add]="dotPath()" (click)="add()">Add</button>
      @if (array.errors(); as errors) {
        <small [attr.data-error]="dotPath()">{{ errors[0] }}</small>
      }
    </fieldset>
  `,
})
export class ArrayField {
  readonly form = input.required<FormStore>()
  readonly visibility = input.required<VisibilityState>()
  readonly node = input.required<LayoutField>()
  readonly indexes = input.required<readonly number[]>()

  protected readonly field = computed(() => this.node().node.field)
  protected readonly path = computed(() => toFieldPath(this.node().node.dataPath, this.indexes()))
  protected readonly dotPath = computed(() => this.path().join('.'))
  protected readonly array = injectFieldArray(this.form, { path: this.path as never })

  protected add(): void {
    insert(this.form(), {
      path: this.path() as never,
      initialInput: builder.getItemInput(this.field()) as never,
    })
  }

  protected remove(index: number): void {
    remove(this.form(), { path: this.path() as never, at: index })
  }
}

/** The content of the layout's slots, by name. */
type Slots = Readonly<Record<string, TemplateRef<unknown>>>

/** The nodes of a step, a section, a row's cell, a group or an array item, each by its type. */
@Component({
  selector: 'json-layout',
  imports: [ArrayField, NgTemplateOutlet, ValueField],
  template: `
    @for (node of shown(); track node.key) {
      @if (node.type === 'section') {
        <fieldset>
          <legend>{{ node.section.label }}</legend>
          <json-layout
            [form]="form()"
            [visibility]="visibility()"
            [nodes]="node.children"
            [indexes]="indexes()"
            [slots]="slots()"
          />
        </fieldset>
      } @else if (node.type === 'row') {
        <!-- One line of a 12-column grid, where each cell takes its span. -->
        <div style="display: grid; grid-template-columns: repeat(12, 1fr)">
          @for (cell of node.children; track cell.key) {
            <div [attr.data-span]="cell.span" [style.grid-column]="'span ' + cell.span">
              <json-layout
                [form]="form()"
                [visibility]="visibility()"
                [nodes]="[cell]"
                [indexes]="indexes()"
                [slots]="slots()"
              />
            </div>
          }
        </div>
      } @else if (node.type === 'slot') {
        <ng-container [ngTemplateOutlet]="slots()[node.name] ?? null" />
      } @else if (node.node.role === 'display') {
        @if (node.node.type === 'heading') {
          @switch (node.node.field['level'] ?? 2) {
            @case (1) {
              <h1>{{ node.node.field['text'] }}</h1>
            }
            @case (3) {
              <h3>{{ node.node.field['text'] }}</h3>
            }
            @case (4) {
              <h4>{{ node.node.field['text'] }}</h4>
            }
            @case (5) {
              <h5>{{ node.node.field['text'] }}</h5>
            }
            @case (6) {
              <h6>{{ node.node.field['text'] }}</h6>
            }
            @default {
              <h2>{{ node.node.field['text'] }}</h2>
            }
          }
        } @else if (node.node.type === 'paragraph') {
          <p>{{ node.node.field['text'] }}</p>
        } @else {
          <hr />
        }
      } @else if (node.node.role === 'group') {
        <fieldset>
          <legend>{{ node.node.field.label ?? node.node.field.name }}</legend>
          <json-layout
            [form]="form()"
            [visibility]="visibility()"
            [nodes]="node.children"
            [indexes]="indexes()"
            [slots]="slots()"
          />
        </fieldset>
      } @else if (node.node.role === 'array') {
        <json-array-field
          [form]="form()"
          [visibility]="visibility()"
          [node]="node"
          [indexes]="indexes()"
        />
      } @else {
        <json-value-field [form]="form()" [node]="node.node" [indexes]="indexes()" />
      }
    }
  `,
})
export class JsonLayout {
  readonly form = input.required<FormStore>()
  /** What the conditions hide now: the nodes it hides are left out. */
  readonly visibility = input.required<VisibilityState>()
  readonly nodes = input.required<readonly LayoutNode[]>()
  /** The index of each array item the nodes are in, outermost first. */
  readonly indexes = input.required<readonly number[]>()
  readonly slots = input.required<Slots>()

  protected readonly shown = computed(() =>
    this.visibility().shownNodes(this.nodes(), this.indexes()),
  )
}

/** Renders a definition as a Formisch form, a step at a time, and emits the output on submit. */
@Component({
  selector: 'json-form-view',
  imports: [FormischForm, JsonLayout],
  template: `
    @if (form; as form) {
      <form [formischForm]="form" [formischSubmit]="handleSubmit">
        <!-- Tracked by the step, so its fields render anew when it changes. -->
        @for (current of [step()]; track current) {
          <json-layout
            [form]="form"
            [visibility]="visibility()"
            [nodes]="current.children"
            [indexes]="[]"
            [slots]="slots()"
          />
        }
        @if (before() !== undefined) {
          <button type="button" data-back="" (click)="index.set(before()!)">Back</button>
        }
        @if (after() !== undefined) {
          <button type="button" data-next="" (click)="next()">Next</button>
        } @else {
          <button type="submit">Save</button>
        }
      </form>
    }
  `,
})
export class JsonFormView implements OnInit {
  readonly json = input.required<JsonForm>()
  readonly slots = input<Slots>({})
  readonly submitted = output<unknown>()

  private readonly injector = inject(Injector)
  protected form: FormStore | undefined
  protected steps: readonly LayoutStep[] = []
  private conditions: Visibility | undefined
  protected readonly index = signal(0)
  protected readonly step = computed(() => this.steps[this.index()] as LayoutStep)

  /** What the conditions hide for the input now: the same object until that changes. */
  protected readonly visibility = computed(() =>
    (this.conditions as Visibility).of(getInput(this.form as FormStore)),
  )
  /** A step whose fields are all hidden is skipped. The current one stays, while the user is on it. */
  private readonly shown = computed(() =>
    this.steps.flatMap((each, i) =>
      i === this.index() || !this.visibility().isStepHidden(each) ? [i] : [],
    ),
  )
  protected readonly before = computed(() => this.shown()[this.shown().indexOf(this.index()) - 1])
  protected readonly after = computed(() => this.shown()[this.shown().indexOf(this.index()) + 1])

  // Formisch reads its config once, in an injection context. Inputs are set from ngOnInit.
  ngOnInit(): void {
    const json = this.json()
    this.steps = builder.getLayout(json).steps
    this.conditions = builder.getVisibility(json)
    this.form = runInInjectionContext(this.injector, () => {
      const form = injectForm({
        schema: builder.build(json),
        initialInput: builder.getInitialInput(json),
      })
      // The fields the conditions clear, set blank as soon as they are cleared.
      effect(() => {
        const { toClear } = this.visibility()
        untracked(() => {
          for (const { path, input } of toClear) setInput(form, { path, input } as never)
        })
      })
      return form
    })
  }

  /** Validates the whole form. Only the issues on this step's fields keep the user here. */
  protected async next(): Promise<void> {
    const form = this.form as FormStore
    const found = issuesOfStep(this.step(), (await validate(form)).issues)
    if (found.length) {
      const first = found.find((issue) => issue.field.role === 'value')
      if (first) focus(form, { path: first.path as never })
      return
    }
    const after = this.after()
    if (after === undefined) return
    // That validation set errors on the next step's fields too, which nobody saw.
    for (const path of fieldPathsOf(this.steps[after] as LayoutStep, getInput(form))) {
      setErrors(form, { path, errors: null } as never)
    }
    this.index.set(after)
  }

  protected readonly handleSubmit = (output: unknown) => this.submitted.emit(output)
}
