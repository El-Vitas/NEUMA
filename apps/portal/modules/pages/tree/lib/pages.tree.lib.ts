import {
  PAGE_TREE_EMPTY_SPACE_STATE,
  PAGE_TREE_MAX_DEPTH,
  PAGE_TREE_MAX_WINDOW_SIZE,
  PAGE_TREE_ROOT_KEY,
  PAGE_TREE_WINDOW_SIZE,
} from '../constants/pages.tree.constants';
import type {
  PageTreeBranch,
  PageTreeBranchVisit,
  PageTreeChildren,
  PageTreeEntry,
  PageTreeSpaceRoots,
  PageTreeSpaceState,
  PageTreeWindowRequest,
} from '../types/pages.tree.types';

export const createEmptyPageTreeSpace = (): PageTreeSpaceState => PAGE_TREE_EMPTY_SPACE_STATE;

export const toPageTreeBranchKey = (parentId: string | null): string => parentId ?? PAGE_TREE_ROOT_KEY;

const placeIds = (placed: Map<number, string>, from: number, ids: readonly string[]): void => {
  for (const [index, id] of ids.entries()) placed.set(from + index, id);
};

/** The indexes from the one before the window to the last one that follows without a gap. */
const findContiguousRun = (placed: ReadonlyMap<number, string>, from: number, until: number): [number, number] => {
  let start = from;
  while (placed.has(start - 1)) start -= 1;
  let end = until;
  while (placed.has(end)) end += 1;
  return [start, end];
};

const withoutRepeats = (ids: readonly string[]): string[] => ids.filter((id, at) => ids.indexOf(id) === at);

const trimPastTotal = (placed: Map<number, string>, total: number): void => {
  for (const index of [...placed.keys()]) {
    if (index >= total) placed.delete(index);
  }
};

const mergeBranch = (
  existing: PageTreeBranch | undefined,
  skip: number,
  ids: readonly string[],
  total: number,
): PageTreeBranch => {
  const placed = new Map<number, string>();
  if (existing !== undefined) placeIds(placed, existing.offset, existing.ids);
  placeIds(placed, skip, ids);
  trimPastTotal(placed, total);
  if (ids.length === 0 && existing === undefined) return { ids: [], offset: skip, total };
  const [start, end] =
    ids.length === 0 ? findRunOf(placed, existing?.offset ?? skip) : findContiguousRun(placed, skip, skip + ids.length);
  const run = Array.from({ length: end - start }, (_, index) => placed.get(start + index) ?? '');
  return { ids: withoutRepeats(run), offset: start, total };
};

const findRunOf = (placed: ReadonlyMap<number, string>, anchor: number): [number, number] =>
  placed.has(anchor) ? findContiguousRun(placed, anchor, anchor + 1) : [anchor, anchor];

/** Stores a window of the children of a parent; it joins the stretch already loaded when it touches it. */
export const mergePageTreeWindow = (
  space: PageTreeSpaceState,
  parentId: string | null,
  skip: number,
  children: PageTreeChildren,
): PageTreeSpaceState => {
  const key = toPageTreeBranchKey(parentId);
  const entries = { ...space.entries };
  for (const entry of children.entries) entries[entry.id] = entry;
  const branch = mergeBranch(
    space.branches[key],
    skip,
    children.entries.map((entry) => entry.id),
    children.total,
  );
  return { branches: { ...space.branches, [key]: branch }, entries };
};

/** The point of the database each space's top was read at, for the first subscription to catch up from. */
export const listPageTreeWatermarks = (spaces: readonly PageTreeSpaceRoots[]): Record<string, string> =>
  Object.fromEntries(
    spaces.flatMap(({ id, roots }) => (roots.watermark === undefined ? [] : [[id, roots.watermark] as const])),
  );

/** What changed in the top of the spaces, for telling a redraw with new pages from one with the same ones. */
export const buildPageTreeRootsSignature = (spaces: readonly PageTreeSpaceRoots[]): string =>
  spaces
    .map(({ id, roots }) => {
      const entries = roots.entries.map((entry) => `${entry.id}.${String(entry.version)}.${String(entry.hasChildren)}`);
      return `${id}:${String(roots.total)}:${entries.join(',')}`;
    })
    .join('|');

/**
 * Puts a page the backend does not list, the open one when it is in the trash, at the end of its parent's list.
 * Reading the list again drops it, which is right: it is shown only while it is open.
 */
export const appendPageTreeEntry = (space: PageTreeSpaceState, entry: PageTreeEntry): PageTreeSpaceState => {
  const key = toPageTreeBranchKey(entry.parentId);
  const branch = space.branches[key];
  if (branch === undefined || branch.ids.includes(entry.id)) return space;
  return {
    branches: { ...space.branches, [key]: { ...branch, ids: [...branch.ids, entry.id] } },
    entries: { ...space.entries, [entry.id]: entry },
  };
};

/** The branches the top of the space can reach, each before the ones under its pages. */
const listReachableBranches = (space: PageTreeSpaceState): PageTreeBranchVisit[] => {
  const visits: PageTreeBranchVisit[] = [];
  const seen = new Set<string>();
  const visit = (key: string, depth: number): void => {
    const branch = space.branches[key];
    if (branch === undefined || seen.has(key) || depth > PAGE_TREE_MAX_DEPTH) return;
    seen.add(key);
    visits.push({ branch, key });
    for (const id of branch.ids) visit(id, depth + 1);
  };
  visit(PAGE_TREE_ROOT_KEY, 0);
  return visits;
};

/** The loaded pages in tree order, each with its place among its siblings; the ones whose parent left are gone. */
export const selectPageTreeEntries = (space: PageTreeSpaceState): PageTreeEntry[] =>
  listReachableBranches(space).flatMap(({ branch }) =>
    branch.ids.flatMap((id, index) => {
      const entry = space.entries[id];
      return entry === undefined ? [] : [{ ...entry, order: branch.offset + index }];
    }),
  );

/** Whether the loaded stretch of a parent leaves pages out before it or after it. */
export const readPageTreeBranchBounds = (
  space: PageTreeSpaceState,
  parentId: string | null,
): { readonly hasNext: boolean; readonly hasPrevious: boolean } => {
  const branch = space.branches[toPageTreeBranchKey(parentId)];
  if (branch === undefined) return { hasNext: false, hasPrevious: false };
  return { hasNext: branch.offset + branch.ids.length < branch.total, hasPrevious: branch.offset > 0 };
};

/** Room for a page that arrived since: one window more than what is loaded. */
const readWantedLength = (loadedLength: number): number =>
  (Math.floor(loadedLength / PAGE_TREE_WINDOW_SIZE) + 1) * PAGE_TREE_WINDOW_SIZE;

const splitIntoWindows = (parentId: string | null, offset: number, wantedLength: number): PageTreeWindowRequest[] =>
  Array.from({ length: Math.ceil(wantedLength / PAGE_TREE_MAX_WINDOW_SIZE) }, (_, index) => ({
    parentId,
    skip: offset + index * PAGE_TREE_MAX_WINDOW_SIZE,
    take: Math.min(PAGE_TREE_MAX_WINDOW_SIZE, wantedLength - index * PAGE_TREE_MAX_WINDOW_SIZE),
  }));

/** What to ask the backend to read the open branches again, the top first. */
export const listPageTreeReloadWindows = (space: PageTreeSpaceState): PageTreeWindowRequest[] =>
  listReachableBranches(space).flatMap(({ branch, key }) =>
    splitIntoWindows(key === PAGE_TREE_ROOT_KEY ? null : key, branch.offset, readWantedLength(branch.ids.length)),
  );
