<script lang="ts">
  import { type FormStore, useField } from '@formisch/svelte'
  import {
    coerceInput,
    type FieldNode,
    isRequired,
    toFieldPath,
  } from '@whatsaaaa/form-builder-schema'

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

  let { form, node, indexes }: { form: FormStore; node: FieldNode; indexes: readonly number[] } =
    $props()

  const path = $derived(toFieldPath(node.dataPath, indexes))
  const field = useField(
    () => form,
    () => ({ path: path as never }),
  )
  // Turns what the element gives into the field's value, e.g. '5' into 5 for a number.
  const set = (input: unknown) => field.onInput(coerceInput(input, node) as never)
  const input = $derived(field.input as unknown)
  const picked = $derived(Array.isArray(input) ? (input as unknown[]) : [])
  const options = $derived((node.field.options ?? []) as Option[])
  const multiple = $derived(node.kind === 'array')

  // A select's value is the option's index, and the option sets its own value.
  const choose = (element: HTMLSelectElement) => {
    const values = [...element.selectedOptions].map((option) => options[Number(option.value)]?.value)
    set(multiple ? values : values[0])
  }
  // A checkbox of a multiselect adds its option's value, or takes it out.
  const toggle = (option: Option, checked: boolean) =>
    set(checked ? [...picked, option.value] : picked.filter((value) => value !== option.value))
</script>

{#snippet label()}
  <span>{node.field.label ?? node.field.name}{isRequired(node.field) ? ' *' : ''}</span>
{/snippet}

{#snippet error()}
  {#if field.errors}
    <small data-error={path.join('.')}>{field.errors[0]}</small>
  {/if}
{/snippet}

<!-- Radio buttons and checkboxes set their option's own value, so 2 stays a number. -->
{#if node.type === 'radio' || (node.type === 'multiselect' && node.field.ui?.widget === 'checkboxes')}
  <fieldset>
    <legend>{@render label()}</legend>
    {#each options as option (option.value)}
      <label>
        {#if node.type === 'radio'}
          <input
            {...field.props}
            type="radio"
            checked={input === option.value}
            oninput={() => set(option.value)}
          />
        {:else}
          <input
            {...field.props}
            type="checkbox"
            checked={picked.includes(option.value)}
            oninput={(e) => toggle(option, e.currentTarget.checked)}
          />
        {/if}
        {option.label}
      </label>
    {/each}
    {@render error()}
  </fieldset>
{:else}
  <label>
    {@render label()}
    {#if node.type === 'checkbox'}
      <input
        {...field.props}
        type="checkbox"
        checked={input === true}
        oninput={(e) => set(e.currentTarget.checked)}
      />
    {:else if options.length}
      <select {...field.props} {multiple} oninput={(e) => choose(e.currentTarget)}>
        {#if !multiple}
          <option value={-1}>Choose…</option>
        {/if}
        {#each options as option, i (option.value)}
          <option
            value={i}
            selected={multiple ? picked.includes(option.value) : input === option.value}
          >
            {option.label}
          </option>
        {/each}
      </select>
    {:else if node.type === 'file'}
      <!-- Never set a file input's value. It gives a FileList, which coerceInput reads. -->
      <input
        {...field.props}
        type="file"
        {multiple}
        accept={node.field.accept as string | undefined}
        oninput={(e) => set(e.currentTarget.files)}
      />
    {:else if node.type === 'textarea'}
      <textarea
        {...field.props}
        value={(input as string | undefined) ?? ''}
        oninput={(e) => set(e.currentTarget.value)}
      ></textarea>
    {:else}
      <input
        {...field.props}
        type={inputTypes[node.type] ?? 'text'}
        value={(input as string | number | undefined) ?? ''}
        placeholder={node.field.placeholder}
        oninput={(e) => set(e.currentTarget.value)}
      />
    {/if}
    {@render error()}
  </label>
{/if}
