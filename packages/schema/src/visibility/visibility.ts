import type { DefinitionPath } from '../errors/definition-error'
import type { FieldNode } from '../render/field-tree'
import type { LayoutNode, LayoutStep } from '../render/form-layout'
import {
  hasCounting,
  type IsFieldShown,
  type ShownRules,
  shownNodesWith,
} from '../render/shown-nodes'
import type { FieldPath } from '../render/to-field-path'
import type { Engine, Evaluation } from './engine'
import { update } from './gate'

/**
 * Which fields and layout nodes a definition's conditions hide, as the builder's
 * `getVisibility(json)` gives it. Get the state for the form's input with `of()`.
 */
export interface Visibility {
  /**
   * True when a field or a node of the layout has conditions, so what is hidden depends on the
   * input. When false, `of()` always gives the same state, which hides nothing.
   */
  readonly conditional: boolean
  /**
   * What is hidden for an input, e.g. Formisch's `getInput(form)`. It gives the same object as
   * the last call while what is hidden and what to clear stay the same, so a renderer can update
   * only when they change.
   */
  of(input: unknown): VisibilityState
  /**
   * The input with every field its conditions clear made blank: left out, or `[]` for an array.
   * The builder's `getInitialInput` gives it so already.
   */
  clear<T>(input: T): T
}

/** What is hidden for one input. */
export interface VisibilityState {
  /**
   * True when the field is hidden: by its own conditions, by those of a group, array, section or
   * step it is in, or because it is a group whose fields are all hidden. `node` is a field from
   * `getFieldTree` or `getLayout`, display elements included, and `indexes` are those of the array
   * items it is in, outermost first.
   */
  isHidden(node: FieldNode, indexes: readonly number[]): boolean
  /**
   * True when the step is hidden: by its own conditions, or because the fields placed in it are
   * all hidden. Steps that are hidden are skipped.
   */
  isStepHidden(step: LayoutStep): boolean
  /**
   * The nodes to render, like the `shownNodes` function: the hidden fields drop out, and so do the
   * hidden sections, and the groups, sections and rows whose fields are all hidden. A display
   * element or a section with conditions of its own counts like a field. `isShown` can leave out
   * more fields, e.g. the ones rendered somewhere else.
   */
  shownNodes(
    nodes: readonly LayoutNode[],
    indexes: readonly number[],
    isShown?: IsFieldShown,
  ): LayoutNode[]
  /**
   * The cleared fields that still hold something, each with the input that blanks it: set them
   * with Formisch's `setInput`, e.g. in an effect. Once they are set, the list is empty. The
   * schema blanks their output either way.
   */
  readonly toClear: readonly FieldToClear[]
}

/** A field to set to its blank input, because its conditions clear it. */
export interface FieldToClear {
  /** Its Formisch path: `['shipping', 'zip']`, or `['lines', 0, 'sku']`. */
  readonly path: FieldPath
  /** Undefined, or `[]` for an array, whose items go too. */
  readonly input: unknown
}

/** The visibility of `engine`, or of a definition without conditions when there is none. */
export function createVisibility(engine: Engine | undefined): Visibility {
  if (!engine?.conditional) return NO_CONDITIONS
  let last: { signature: string; state: VisibilityState } | undefined
  return {
    conditional: true,
    of(input) {
      const evaluation = engine.evaluate(input)
      if (last?.signature !== evaluation.signature) {
        last = { signature: evaluation.signature, state: createState(engine, evaluation) }
      }
      return last.state
    },
    clear: (input) => clearFields(input, engine.evaluate(input).toClear),
  }
}

const shownEverywhere: ShownRules = {
  isShown: () => true,
  isSectionHidden: () => false,
  counts: () => false,
}

const ALL_SHOWN: VisibilityState = {
  isHidden: () => false,
  isStepHidden: () => false,
  shownNodes: (nodes, indexes, isShown) =>
    shownNodesWith(nodes, indexes, isShown ? { ...shownEverywhere, isShown } : shownEverywhere),
  toClear: [],
}

/** The visibility of a definition without conditions, or of a builder without extensions. */
export const NO_CONDITIONS: Visibility = {
  conditional: false,
  of: () => ALL_SHOWN,
  clear: (input) => input,
}

function createState(engine: Engine, evaluation: Evaluation): VisibilityState {
  /** Hidden by its own conditions, or by those of something it is in. */
  const hiddenItself = (definitionPath: DefinitionPath, indexes: readonly number[]) => {
    const unit = engine.unitAt(definitionPath)
    return !!unit && evaluation.stateOf(unit, indexes).hidden
  }
  const hasConditions = (definitionPath: DefinitionPath) =>
    !!engine.unitAt(definitionPath)?.conditions

  function isHidden(node: FieldNode, indexes: readonly number[]): boolean {
    if (hiddenItself(node.definitionPath, indexes)) return true
    if (node.role !== 'group') return false
    const counting = node.children.filter(
      (child) => child.role !== 'display' || hasConditions(child.definitionPath),
    )
    return counting.length > 0 && counting.every((child) => isHidden(child, indexes))
  }

  const rulesWith = (isShown: IsFieldShown | undefined): ShownRules => ({
    // A group in a layout drops out by the fields the layout places in it.
    isShown: (node, indexes) =>
      !hiddenItself(node.definitionPath, indexes) && (isShown?.(node, indexes) ?? true),
    isSectionHidden: (section, indexes) => hiddenItself(section.definitionPath, indexes),
    counts: (node) => hasConditions(node.definitionPath),
  })
  const rules = rulesWith(undefined)

  return {
    isHidden,
    isStepHidden(step) {
      if (hiddenItself(step.definitionPath, [])) return true
      return (
        hasCounting(step.children, rules) &&
        !hasCounting(shownNodesWith(step.children, [], rules), rules)
      )
    },
    shownNodes: (nodes, indexes, isShown) =>
      shownNodesWith(nodes, indexes, isShown ? rulesWith(isShown) : rules),
    toClear: evaluation.toClear,
  }
}

/** `input` with each field of `toClear` left out, and each array of it empty. */
export function clearFields<T>(input: T, toClear: readonly FieldToClear[]): T {
  let cleared: unknown = input
  for (const { path, input: blank } of toClear) {
    cleared =
      blank === undefined
        ? update(cleared, path.slice(0, -1), (parent) => without(parent, path.at(-1) as string))
        : update(cleared, path, () => blank)
  }
  return cleared as T
}

function without(parent: unknown, key: string): unknown {
  if (typeof parent !== 'object' || parent === null) return parent
  const { [key]: _, ...rest } = parent as Record<string, unknown>
  return rest
}
