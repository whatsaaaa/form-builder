import { allLayoutNodes } from './all-layout-nodes'
import type { FormLayout } from './form-layout'

/**
 * Throws a `TypeError` naming every layout type the layout uses that `components` has no entry
 * for, like `section` or `row`, and every slot that `slots` has no content for. A renderer that
 * takes a component per layout type checks the whole layout before it renders, so a missing one
 * shows up at once rather than on the step that uses it. A layout without sections, rows and
 * slots, like the one of a definition without a `layout`, needs none.
 */
export function checkLayoutComponents(
  layout: FormLayout,
  components: Readonly<Record<string, unknown>>,
  slots: Readonly<Record<string, unknown>>,
): void {
  const types = new Set<string>()
  const names = new Set<string>()
  for (const step of layout.steps) {
    for (const node of allLayoutNodes(step.children)) {
      if (node.type === 'slot') {
        if (!Object.hasOwn(slots, node.name)) names.add(node.name)
      } else if (node.type !== 'field' && !Object.hasOwn(components, node.type)) {
        types.add(node.type)
      }
    }
  }

  // A missing component is a mistake in the code, not in the definition, so it throws early.
  const problems = [
    types.size &&
      `No component for the layout ${list(types, 'type')}. Add ${them(types)} to the layout components.`,
    names.size && `No content for the ${list(names, 'slot')}. Pass ${them(names)} to the renderer.`,
  ].filter(Boolean)
  if (problems.length) throw new TypeError(problems.join(' '))
}

const list = (names: ReadonlySet<string>, noun: string) =>
  `${noun}${names.size > 1 ? 's' : ''} ${[...names].map((name) => `"${name}"`).join(', ')}`

const them = (names: ReadonlySet<string>) => (names.size > 1 ? 'them' : 'it')
