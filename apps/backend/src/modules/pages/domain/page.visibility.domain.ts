import {
  type BlockPermissions,
  type BlockViewer,
  canReadBlock,
  type PageContent,
  pageContentSchema,
} from '@neuma/shared';
import {
  indexById,
  listDeclaringAncestors,
  resolveRoleFromDeclaring,
} from '../../../common/domain/block-access.domain';
import type { PageContentBlock, PageDocumentSource, ReadableContentBlocks } from './page.block.domain.types';

const collectBranch = (rootId: string, blocksById: ReadonlyMap<string, PageContentBlock>): string[] => {
  const branch: string[] = [];
  const pending = [rootId];
  for (let id = pending.pop(); id !== undefined; id = pending.pop()) {
    branch.push(id);
    pending.push(...(blocksById.get(id)?.children ?? []));
  }
  return branch;
};

/**
 * The blocks of a page the viewer may read, from the top down: a block that declares permissions answers by them,
 * one that does not answers as the block above it does, and a block the viewer cannot read takes its whole branch
 * with it, whatever the blocks below declare. The ids of what is left out are returned, to cut them elsewhere.
 */
export const listReadableContentBlocks = (
  page: Pick<PageDocumentSource, 'children' | 'id'>,
  declared: BlockPermissions,
  blocks: readonly PageContentBlock[],
  viewer: BlockViewer,
): ReadableContentBlocks => {
  const blocksById = new Map(blocks.map((block) => [block.id, block]));
  const declaringById = listDeclaringAncestors(
    indexById([{ id: page.id, parentId: null, permissions: declared }, ...blocks]),
  );
  const readable: PageContentBlock[] = [];
  const hiddenIds = new Set<string>();
  const pending = [...page.children];
  for (let cursor = 0; cursor < pending.length; cursor += 1) {
    const block = blocksById.get(pending[cursor] ?? '');
    if (block === undefined) continue;
    const role = resolveRoleFromDeclaring(declaringById.get(block.id) ?? null, true, viewer);
    if (canReadBlock(role)) {
      readable.push(block);
      pending.push(...block.children);
    } else {
      for (const id of collectBranch(block.id, blocksById)) hiddenIds.add(id);
    }
  }
  return { hiddenIds, readable };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readNodeId = (node: unknown): unknown => (isRecord(node) && isRecord(node.attrs) ? node.attrs.id : undefined);

const dropFromNode = (node: unknown, hiddenIds: ReadonlySet<string>): unknown => {
  if (!isRecord(node) || !Array.isArray(node.content)) return node;
  return { ...node, content: dropFromList(node.content, hiddenIds) };
};

const dropFromList = (nodes: readonly unknown[], hiddenIds: ReadonlySet<string>): unknown[] =>
  nodes
    .filter((node) => {
      const id = readNodeId(node);
      return typeof id !== 'string' || !hiddenIds.has(id);
    })
    .map((node) => dropFromNode(node, hiddenIds));

/**
 * The document without the nodes of the hidden blocks and what is below them. If what is left is no longer a
 * document (a list with no item), nothing is shown rather than a part that could carry what was cut.
 */
export const dropHiddenBlocks = (content: PageContent, hiddenIds: ReadonlySet<string>): PageContent => {
  if (hiddenIds.size === 0) return content;
  const shown = pageContentSchema.safeParse({ ...content, content: dropFromList(content.content, hiddenIds) });
  return shown.success ? shown.data : { ...content, content: [] };
};
