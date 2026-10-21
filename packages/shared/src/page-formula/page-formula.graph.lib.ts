type Edges = ReadonlyMap<string, readonly string[]>;

interface Walk {
  readonly finished: Set<string>;
  readonly onPath: string[];
}

const findCycleFrom = (edges: Edges, node: string, walk: Walk): readonly string[] | null => {
  const position = walk.onPath.indexOf(node);
  if (position >= 0) return walk.onPath.slice(position);
  if (walk.finished.has(node)) return null;
  walk.onPath.push(node);
  for (const next of edges.get(node) ?? []) {
    const cycle = findCycleFrom(edges, next, walk);
    if (cycle !== null) return cycle;
  }
  walk.onPath.pop();
  walk.finished.add(node);
  return null;
};

/**
 * The properties of one cycle in the "reads" graph, or null when there is none. A node with no entry reads nothing
 * (a stored property), so it ends a path.
 */
export const findPageReferenceCycle = (edges: Edges): readonly string[] | null => {
  const walk: Walk = { finished: new Set(), onPath: [] };
  for (const node of edges.keys()) {
    const cycle = findCycleFrom(edges, node, walk);
    if (cycle !== null) return cycle;
  }
  return null;
};

const measureFrom = (edges: Edges, node: string, depths: Map<string, number>): number => {
  const known = depths.get(node);
  if (known !== undefined) return known;
  const deepest = Math.max(0, ...(edges.get(node) ?? []).map((next) => measureFrom(edges, next, depths)));
  depths.set(node, deepest + 1);
  return deepest + 1;
};

/** How many properties the longest chain starting at `start` passes through, itself included. Expects no cycle. */
export const measurePageReferenceDepth = (edges: Edges, start: string): number => measureFrom(edges, start, new Map());
