import { NgTemplateOutlet } from '@angular/common'
import {
  Component,
  computed,
  forwardRef,
  inject,
  Injector,
  input,
  type OnInit,
  output,
  runInInjectionContext,
} from '@angular/core'
import {
  FormischControl,
  FormischForm,
  type FormStore,
  injectField,
  injectFieldArray,
  injectForm,
  insert,
  remove,
} from '@formisch/angular'
import {
  coerceInput,
  createSchemaBuilder,
  type FieldNode,
  isRequired,
  type JsonForm,
  toFieldPath,
} from '@whatsaaaa/form-builder-schema'

const builder = createSchemaBuilder()

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

/** A container of kind `array`: Formisch's field array, and the fields of each item. */
@Component({
  selector: 'json-array-field',
  imports: [forwardRef(() => JsonFields)],
  template: `
    <fieldset>
      <legend>{{ node().field.label ?? node().field.name }}</legend>
      @for (item of array.items(); track item; let index = $index) {
        <div>
          <json-fields
            [form]="form()"
            [nodes]="node().children"
            [indexes]="[...indexes(), index]"
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
  readonly node = input.required<FieldNode>()
  readonly indexes = input.required<readonly number[]>()

  protected readonly path = computed(() => toFieldPath(this.node().dataPath, this.indexes()))
  protected readonly dotPath = computed(() => this.path().join('.'))
  protected readonly array = injectFieldArray(this.form, { path: this.path as never })

  protected add(): void {
    insert(this.form(), {
      path: this.path() as never,
      initialInput: builder.getItemInput(this.node().field) as never,
    })
  }

  protected remove(index: number): void {
    remove(this.form(), { path: this.path() as never, at: index })
  }
}

/** The fields of a definition, a group or an array item, each by its role. */
@Component({
  selector: 'json-fields',
  imports: [ArrayField, ValueField],
  template: `
    @for (node of nodes(); track $index) {
      @switch (node.role) {
        @case ('display') {
          @if (node.type === 'heading') {
            @switch (node.field['level'] ?? 2) {
              @case (1) {
                <h1>{{ node.field['text'] }}</h1>
              }
              @case (3) {
                <h3>{{ node.field['text'] }}</h3>
              }
              @case (4) {
                <h4>{{ node.field['text'] }}</h4>
              }
              @case (5) {
                <h5>{{ node.field['text'] }}</h5>
              }
              @case (6) {
                <h6>{{ node.field['text'] }}</h6>
              }
              @default {
                <h2>{{ node.field['text'] }}</h2>
              }
            }
          } @else if (node.type === 'paragraph') {
            <p>{{ node.field['text'] }}</p>
          } @else {
            <hr />
          }
        }
        @case ('group') {
          <fieldset>
            <legend>{{ node.field.label ?? node.field.name }}</legend>
            <json-fields [form]="form()" [nodes]="node.children" [indexes]="indexes()" />
          </fieldset>
        }
        @case ('array') {
          <json-array-field [form]="form()" [node]="node" [indexes]="indexes()" />
        }
        @case ('value') {
          <json-value-field [form]="form()" [node]="node" [indexes]="indexes()" />
        }
      }
    }
  `,
})
export class JsonFields {
  readonly form = input.required<FormStore>()
  readonly nodes = input.required<readonly FieldNode[]>()
  readonly indexes = input.required<readonly number[]>()
}

/** Renders a definition as a Formisch form, and emits the output when it submits. */
@Component({
  selector: 'json-form-view',
  imports: [FormischForm, JsonFields],
  template: `
    @if (form; as form) {
      <form [formischForm]="form" [formischSubmit]="handleSubmit">
        <json-fields [form]="form" [nodes]="fields" [indexes]="[]" />
        <button type="submit">Save</button>
      </form>
    }
  `,
})
export class JsonFormView implements OnInit {
  readonly json = input.required<JsonForm>()
  readonly submitted = output<unknown>()

  private readonly injector = inject(Injector)
  protected form: FormStore | undefined
  protected fields: readonly FieldNode[] = []

  // Formisch reads its config once, in an injection context. Inputs are set from ngOnInit.
  ngOnInit(): void {
    const json = this.json()
    this.fields = builder.getFieldTree(json)
    this.form = runInInjectionContext(this.injector, () =>
      injectForm({ schema: builder.build(json), initialInput: builder.getInitialInput(json) }),
    )
  }

  protected readonly handleSubmit = (output: unknown) => this.submitted.emit(output)
}
