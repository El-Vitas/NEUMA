import { PAGE_BLOCK_ITEM_TYPES, PAGE_BLOCK_WHOLE_TYPES } from '../page-block/page-block.constants.js';
import { Result } from '../result.js';
import { type PageContent, pageContentSchema } from '../schemas/page-content.schema.js';
import {
  PAGE_DOCUMENT_BLOCK_HOLDERS,
  PAGE_DOCUMENT_EMPTY_PARAGRAPH,
  PAGE_DOCUMENT_LIST_ITEMS,
} from './page-document.constants.js';
import { isPageDocumentNode, listPageDocumentChildren, readPageDocumentBlockId } from './page-document.node.lib.js';
import type { PageBlockPlace, PageDocumentNodeShape } from './page-document.types.js';

type Node = PageDocumentNodeShape;
type Nodes = readonly unknown[];

/** The found block sits at `index` inside `holder`; null means the page root. */
type SiblingsEdit = (siblings: Nodes, index: number, holder: Node | null) => Result<Nodes, string>;

const idOf = (node: unknown): string | null => (isPageDocumentNode(node) ? readPageDocumentBlockId(node) : null);

export const describeMissingPageBlock = (blockId: string): string =>
  `The page has no block ${blockId}. Read the page again with fetch to see its blocks as they are now.`;

const collectIds = (nodes: Nodes): readonly string[] =>
  nodes.flatMap((node) => {
    if (!isPageDocumentNode(node)) return [];
    const own = readPageDocumentBlockId(node);
    const inner = collectIds(node.content ?? []);
    return own === null ? inner : [own, ...inner];
  });

export const findPageBlock = (nodes: Nodes, blockId: string): Node | null => {
  for (const node of nodes) {
    if (!isPageDocumentNode(node)) continue;
    if (readPageDocumentBlockId(node) === blockId) return node;
    const inner = findPageBlock(node.content ?? [], blockId);
    if (inner !== null) return inner;
  }
  return null;
};

/** A list only accepts its items: an incoming list of the same kind is unwrapped into its items. */
const fitInto = (holder: Node | null, nodes: Nodes): Result<Nodes, string> => {
  if (holder !== null && PAGE_BLOCK_WHOLE_TYPES.includes(holder.type))
    return Result.fail(`A ${holder.type} is changed as a whole, not block by block inside it.`);
  const itemType = holder === null ? undefined : PAGE_DOCUMENT_LIST_ITEMS[holder.type];
  if (holder === null || itemType === undefined) return Result.ok(nodes);
  const fitted = nodes.flatMap<unknown>((node) =>
    isPageDocumentNode(node) && PAGE_DOCUMENT_LIST_ITEMS[node.type] === itemType
      ? listPageDocumentChildren(node)
      : [node],
  );
  const misfit = fitted.some((node) => !isPageDocumentNode(node) || node.type !== itemType);
  if (!misfit) return Result.ok(fitted);
  return Result.fail(
    `Only items fit among the items of a ${holder.type}. To add another kind of block, place it after the list (block ${idOf(holder) ?? 'with no id'}).`,
  );
};

const replaceChildren = (nodes: Nodes, position: number, node: Node, children: Nodes): Nodes =>
  children.length === 0
    ? nodes.filter((_, at) => at !== position)
    : nodes.map((sibling, at) => (at === position ? { ...node, content: children } : sibling));

/** Rebuilds only the branch holding the block; an ancestor left empty is dropped with it. */
const editAround = (
  nodes: Nodes,
  blockId: string,
  holder: Node | null,
  edit: SiblingsEdit,
): Result<Nodes, string> | null => {
  const index = nodes.findIndex((node) => idOf(node) === blockId);
  if (index !== -1) return edit(nodes, index, holder);
  for (const [position, node] of nodes.entries()) {
    if (!isPageDocumentNode(node) || node.content === undefined) continue;
    const inner = editAround(node.content, blockId, node, edit);
    if (inner === null) continue;
    return inner.isFail() ? inner : Result.ok(replaceChildren(nodes, position, node, inner.getValue()));
  }
  return null;
};

const withBlocks = (content: PageContent, nodes: Nodes): Result<PageContent, string> => {
  const parsed = pageContentSchema.safeParse({
    ...content,
    content: nodes.length === 0 ? [PAGE_DOCUMENT_EMPTY_PARAGRAPH] : nodes,
  });
  if (parsed.success) return Result.ok(parsed.data);
  const problems = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
  return Result.fail(`The page would not be valid after this change: ${problems}`);
};

const editPage = (content: PageContent, blockId: string, edit: SiblingsEdit): Result<PageContent, string> => {
  const edited = editAround(content.content, blockId, null, edit);
  if (edited === null) return Result.fail(describeMissingPageBlock(blockId));
  return edited.isFail() ? Result.fail(edited.getError()) : withBlocks(content, edited.getValue());
};

const spliceIn = (siblings: Nodes, position: number, nodes: Nodes): Nodes => [
  ...siblings.slice(0, position),
  ...nodes,
  ...siblings.slice(position),
];

const firstInnerPosition = (holder: Node): number => (PAGE_BLOCK_ITEM_TYPES.includes(holder.type) ? 1 : 0);

const insertInside = (content: PageContent, blockId: string, at: 'end' | 'start', nodes: Nodes) =>
  editPage(content, blockId, (siblings, index) => {
    const holder = siblings[index];
    if (!isPageDocumentNode(holder) || !PAGE_DOCUMENT_BLOCK_HOLDERS.includes(holder.type))
      return Result.fail(
        `A ${isPageDocumentNode(holder) ? holder.type : 'block'} holds words, not other blocks: place them after it instead.`,
      );
    const children = holder.content ?? [];
    const fitted = fitInto(holder, nodes);
    if (fitted.isFail()) return Result.fail(fitted.getError());
    const position = at === 'start' ? firstInnerPosition(holder) : children.length;
    return Result.ok(
      siblings.map((sibling, place) =>
        place === index ? { ...holder, content: spliceIn(children, position, fitted.getValue()) } : sibling,
      ),
    );
  });

const insertBeside = (content: PageContent, blockId: string, offset: number, nodes: Nodes) =>
  editPage(content, blockId, (siblings, index, holder) => {
    const fitted = fitInto(holder, nodes);
    return fitted.isFail() ? fitted : Result.ok(spliceIn(siblings, index + offset, fitted.getValue()));
  });

const listTakenIds = (present: Nodes, nodes: Nodes, leaving: Nodes = []): readonly string[] => {
  const left = new Set(collectIds(leaving));
  const taken = new Set(collectIds(present).filter((blockId) => !left.has(blockId)));
  return collectIds(nodes).filter((blockId) => taken.has(blockId));
};

const describeTakenIds = (taken: readonly string[]): string =>
  `The page already has a block ${taken.join(', ')}: new blocks need ids of their own, or none.`;

export const insertPageBlocks = (
  content: PageContent,
  place: PageBlockPlace,
  nodes: Nodes,
): Result<PageContent, string> => {
  const taken = listTakenIds(content.content, nodes);
  if (taken.length > 0) return Result.fail(describeTakenIds(taken));
  if ('inside' in place) return insertInside(content, place.inside, place.at, nodes);
  if ('after' in place) return insertBeside(content, place.after, 1, nodes);
  if ('before' in place) return insertBeside(content, place.before, 0, nodes);
  const blocks = place.at === 'start' ? [...nodes, ...content.content] : [...content.content, ...nodes];
  return withBlocks(content, blocks);
};

/** The replacement keeps the original id so links to it keep working. */
export const replacePageBlock = (content: PageContent, blockId: string, node: unknown): Result<PageContent, string> =>
  editPage(content, blockId, (siblings, index, holder) => {
    const fitted = fitInto(holder, [node]);
    if (fitted.isFail()) return fitted;
    const [replacement] = fitted.getValue();
    if (fitted.getValue().length !== 1 || !isPageDocumentNode(replacement))
      return Result.fail(`Block ${blockId} is replaced by exactly one block.`);
    const taken = listTakenIds(content.content, replacement.content ?? [], [siblings[index]]);
    if (taken.length > 0) return Result.fail(describeTakenIds(taken));
    const withId = { ...replacement, attrs: { ...replacement.attrs, id: blockId } };
    return Result.ok(siblings.map((sibling, at) => (at === index ? withId : sibling)));
  });

const missingIds = (content: PageContent, blockIds: readonly string[]): readonly string[] => {
  const present = new Set(collectIds(content.content));
  return blockIds.filter((blockId) => !present.has(blockId));
};

const removeOne = (nodes: Nodes, blockId: string): Result<Nodes, string> =>
  editAround(nodes, blockId, null, (siblings, index) => Result.ok(siblings.filter((_, at) => at !== index))) ??
  Result.ok(nodes);

/** All-or-nothing. The page is validated once, after every removal, not at each intermediate step. */
export const removePageBlocks = (content: PageContent, blockIds: readonly string[]): Result<PageContent, string> => {
  const missing = missingIds(content, blockIds);
  if (missing.length > 0) return Result.fail(describeMissingPageBlock(missing.join(', ')));
  const removed = blockIds.reduce<Result<Nodes, string>>(
    (current, blockId) => (current.isFail() ? current : removeOne(current.getValue(), blockId)),
    Result.ok(content.content),
  );
  return removed.isFail() ? Result.fail(removed.getError()) : withBlocks(content, removed.getValue());
};

const placeTarget = (place: PageBlockPlace): string | null => {
  if ('inside' in place) return place.inside;
  if ('after' in place) return place.after;
  if ('before' in place) return place.before;
  return null;
};

/** A named block already carried inside a named parent is not moved twice. */
const listTopmostBlocks = (content: PageContent, blockIds: readonly string[]): readonly Node[] => {
  const named = collectIds(content.content).filter((blockId) => blockIds.includes(blockId));
  const nodes = named.map((blockId) => findPageBlock(content.content, blockId)).filter((node) => node !== null);
  const carriedInside = new Set(nodes.flatMap((node) => collectIds(node.content ?? [])));
  return nodes.filter((node) => !carriedInside.has(idOf(node) ?? ''));
};

export const movePageBlocks = (
  content: PageContent,
  blockIds: readonly string[],
  place: PageBlockPlace,
): Result<PageContent, string> => {
  const missing = missingIds(content, blockIds);
  if (missing.length > 0) return Result.fail(describeMissingPageBlock(missing.join(', ')));
  const nodes = listTopmostBlocks(content, blockIds);
  const target = placeTarget(place);
  const carried = new Set(nodes.flatMap((node) => collectIds([node])));
  if (target !== null && carried.has(target))
    return Result.fail(`Block ${target} is inside what is being moved: choose a place outside it.`);
  const removed = removePageBlocks(
    content,
    nodes.flatMap((node) => idOf(node) ?? []),
  );
  return removed.isFail() ? removed : insertPageBlocks(removed.getValue(), place, nodes);
};
