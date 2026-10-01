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

/** Lo que se hace con los hermanos del bloque encontrado: el bloque está en `index`, dentro de `holder`. */
type SiblingsEdit = (siblings: Nodes, index: number, holder: Node | null) => Result<Nodes, string>;

const idOf = (node: unknown): string | null => (isPageDocumentNode(node) ? readPageDocumentBlockId(node) : null);

const notFound = (blockId: string): string =>
  `The page has no block ${blockId}. Read the page again with fetch to see its blocks as they are now.`;

/** Los ids de todos los bloques, en el orden en que se leen. */
const collectIds = (nodes: Nodes): readonly string[] =>
  nodes.flatMap((node) => {
    if (!isPageDocumentNode(node)) return [];
    const own = readPageDocumentBlockId(node);
    const inner = collectIds(node.content ?? []);
    return own === null ? inner : [own, ...inner];
  });

const findNode = (nodes: Nodes, blockId: string): Node | null => {
  for (const node of nodes) {
    if (!isPageDocumentNode(node)) continue;
    if (readPageDocumentBlockId(node) === blockId) return node;
    const inner = findNode(node.content ?? [], blockId);
    if (inner !== null) return inner;
  }
  return null;
};

/**
 * Lo que cabe dentro de un bloque. En una lista caben sus ítems: una lista del
 * mismo tipo que llega se deshace en los suyos, y lo demás no cabe.
 */
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

/**
 * Rehace solo la rama donde está el bloque: sus hermanos pasan por `edit`, y
 * cada bloque de arriba queda igual salvo por lo que cambió dentro. Un bloque
 * que se queda sin nada dentro se va con lo que se le quitó.
 */
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

/** La página con esos bloques, si sigue siendo una página válida. */
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
  if (edited === null) return Result.fail(notFound(blockId));
  return edited.isFail() ? Result.fail(edited.getError()) : withBlocks(content, edited.getValue());
};

const spliceIn = (siblings: Nodes, position: number, nodes: Nodes): Nodes => [
  ...siblings.slice(0, position),
  ...nodes,
  ...siblings.slice(position),
];

/** Dónde empieza lo de adentro de un bloque: en un ítem, después de su propia línea. */
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

/** Pone bloques en un lugar de la página: al principio o al final, junto a un bloque, o dentro de uno. */
export const insertPageBlocks = (
  content: PageContent,
  place: PageBlockPlace,
  nodes: Nodes,
): Result<PageContent, string> => {
  if ('inside' in place) return insertInside(content, place.inside, place.at, nodes);
  if ('after' in place) return insertBeside(content, place.after, 1, nodes);
  if ('before' in place) return insertBeside(content, place.before, 0, nodes);
  const blocks = place.at === 'start' ? [...nodes, ...content.content] : [...content.content, ...nodes];
  return withBlocks(content, blocks);
};

/**
 * Cambia un bloque por otro que conserva su id, así los enlaces que lo
 * señalaban siguen llegando a él.
 */
export const replacePageBlock = (content: PageContent, blockId: string, node: unknown): Result<PageContent, string> =>
  editPage(content, blockId, (siblings, index, holder) => {
    const fitted = fitInto(holder, [node]);
    if (fitted.isFail()) return fitted;
    const [replacement] = fitted.getValue();
    if (fitted.getValue().length !== 1 || !isPageDocumentNode(replacement))
      return Result.fail(`Block ${blockId} is replaced by exactly one block.`);
    const withId = { ...replacement, attrs: { ...replacement.attrs, id: blockId } };
    return Result.ok(siblings.map((sibling, at) => (at === index ? withId : sibling)));
  });

const missingIds = (content: PageContent, blockIds: readonly string[]): readonly string[] => {
  const present = new Set(collectIds(content.content));
  return blockIds.filter((blockId) => !present.has(blockId));
};

const removeOne = (content: PageContent, blockId: string): Result<PageContent, string> => {
  const edited = editAround(content.content, blockId, null, (siblings, index) =>
    Result.ok(siblings.filter((_, at) => at !== index)),
  );
  if (edited === null) return Result.ok(content);
  return edited.isFail() ? Result.fail(edited.getError()) : withBlocks(content, edited.getValue());
};

/**
 * Quita bloques con todo lo que llevan dentro. Si falta alguno, no quita
 * ninguno. Un bloque que ya se fue con otro que lo contenía no se busca de
 * nuevo.
 */
export const removePageBlocks = (content: PageContent, blockIds: readonly string[]): Result<PageContent, string> => {
  const missing = missingIds(content, blockIds);
  if (missing.length > 0) return Result.fail(notFound(missing.join(', ')));
  return blockIds.reduce<Result<PageContent, string>>(
    (current, blockId) => (current.isFail() ? current : removeOne(current.getValue(), blockId)),
    Result.ok(content),
  );
};

const placeTarget = (place: PageBlockPlace): string | null => {
  if ('inside' in place) return place.inside;
  if ('after' in place) return place.after;
  if ('before' in place) return place.before;
  return null;
};

/**
 * Lleva bloques a otro lugar de la misma página, con su id y todo lo que
 * llevan dentro, en el orden en que estaban.
 */
export const movePageBlocks = (
  content: PageContent,
  blockIds: readonly string[],
  place: PageBlockPlace,
): Result<PageContent, string> => {
  const missing = missingIds(content, blockIds);
  if (missing.length > 0) return Result.fail(notFound(missing.join(', ')));
  const moved = collectIds(content.content).filter((blockId) => blockIds.includes(blockId));
  const nodes = moved.map((blockId) => findNode(content.content, blockId)).filter((node) => node !== null);
  const target = placeTarget(place);
  const carried = new Set(nodes.flatMap((node) => collectIds([node])));
  if (target !== null && carried.has(target))
    return Result.fail(`Block ${target} is inside what is being moved: choose a place outside it.`);
  const removed = removePageBlocks(content, moved);
  return removed.isFail() ? removed : insertPageBlocks(removed.getValue(), place, nodes);
};
