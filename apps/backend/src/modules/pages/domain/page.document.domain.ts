import {
  BLOCK_TYPE,
  type BlockTree,
  blocksToDocument,
  type DocumentToBlocksInput,
  documentToBlocks,
  type PageContent,
  Result,
} from '@neuma/shared';
import type { PageContentBlock, PageDocumentSource } from './page.block.domain.types';
import { PageContentValidationError } from './page.error';

/** The ids of the blocks the page lists, and the ones those list in turn: the rest is not part of its document. */
const selectReachableBlocks = (
  source: PageDocumentSource,
  blocks: readonly PageContentBlock[],
): readonly PageContentBlock[] => {
  const blocksById = new Map(blocks.map((block) => [block.id, block]));
  const reachable: PageContentBlock[] = [];
  const pending = [...source.children];
  for (let cursor = 0; cursor < pending.length; cursor += 1) {
    const block = blocksById.get(pending[cursor] ?? '');
    if (block === undefined) continue;
    blocksById.delete(block.id);
    reachable.push(block);
    pending.push(...block.children);
  }
  return reachable;
};

/** The page as the document the editor, the exports and the agents read: its own blocks, not the pages it holds. */
export const buildPageDocument = (
  source: PageDocumentSource,
  blocks: readonly PageContentBlock[],
): Result<PageContent, PageContentValidationError> => {
  const reachable = selectReachableBlocks(source, blocks);
  const reachableIds = new Set(reachable.map((block) => block.id));
  const page = {
    children: source.children.filter((id) => reachableIds.has(id)),
    format: source.format,
    id: source.id,
    parentId: source.parentId,
    properties: source.properties,
    type: BLOCK_TYPE.page,
  };
  const document = blocksToDocument(page, reachable);
  return document.isOk()
    ? Result.ok(document.getValue())
    : Result.fail(new PageContentValidationError({ message: document.getError().message }));
};

/** A document as the page block and one block per document block. */
export const buildPageTree = (input: DocumentToBlocksInput): Result<BlockTree, PageContentValidationError> => {
  const tree = documentToBlocks(input);
  return tree.isOk()
    ? Result.ok(tree.getValue())
    : Result.fail(new PageContentValidationError({ message: tree.getError().message }));
};
