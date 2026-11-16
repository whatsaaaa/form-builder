/**
 * Each loop of nodes that lead to each other, as the nodes around it, starting with the one first
 * in `nodes`. `next(node)` gives the nodes it leads to.
 */
export function findLoops<T>(nodes: readonly T[], next: (node: T) => readonly T[]): T[][] {
  const position = new Map(nodes.map((node, i) => [node, i]))
  const loops: T[][] = []
  for (const component of stronglyConnected(nodes, next)) {
    const inLoop = new Set(component)
    const first = nodes.find((node) => inLoop.has(node)) as T
    // A node on its own is a loop only when it leads to itself.
    if (component.length === 1 && !next(first).includes(first)) continue
    loops.push(loopFrom(first, inLoop, next))
  }
  return loops.sort(
    (a, b) => (position.get(a[0] as T) as number) - (position.get(b[0] as T) as number),
  )
}

/** The shortest way from `start` back to itself through `inLoop`, as its nodes. */
function loopFrom<T>(start: T, inLoop: ReadonlySet<T>, next: (node: T) => readonly T[]): T[] {
  // Each node after the one it was first reached from, nearest first.
  const previous = new Map<T, T>([[start, start]])
  const queue = [start]
  for (const node of queue) {
    for (const after of next(node)) {
      if (!inLoop.has(after) || previous.has(after)) continue
      previous.set(after, node)
      queue.push(after)
    }
  }
  // The nodes form a loop, so one of them leads to `start`: the nearest closes it.
  const loop = [queue.find((node) => next(node).includes(start)) as T]
  while (loop[0] !== start) loop.unshift(previous.get(loop[0] as T) as T)
  return loop
}

/** Tarjan's strongly connected components of the graph. */
function stronglyConnected<T>(nodes: readonly T[], next: (node: T) => readonly T[]): T[][] {
  let count = 0
  const index = new Map<T, number>()
  const low = new Map<T, number>()
  const stack: T[] = []
  const onStack = new Set<T>()
  const components: T[][] = []

  const visit = (node: T) => {
    index.set(node, count)
    low.set(node, count)
    count++
    stack.push(node)
    onStack.add(node)
    for (const after of next(node)) {
      if (!index.has(after)) {
        visit(after)
        low.set(node, Math.min(low.get(node) as number, low.get(after) as number))
      } else if (onStack.has(after)) {
        low.set(node, Math.min(low.get(node) as number, index.get(after) as number))
      }
    }
    if (low.get(node) !== index.get(node)) return
    const component: T[] = []
    let member: T
    do {
      member = stack.pop() as T
      onStack.delete(member)
      component.push(member)
    } while (member !== node)
    components.push(component)
  }

  for (const node of nodes) if (!index.has(node)) visit(node)
  return components
}
