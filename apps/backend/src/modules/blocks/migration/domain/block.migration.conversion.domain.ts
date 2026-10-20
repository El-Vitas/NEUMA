import {
  type BlockDraft,
  type BlockTree,
  blocksToDocument,
  documentToBlocks,
  parseBlockContent,
  Result,
  readBlockText,
} from '@neuma/shared';
import { isSameJson } from '../../domain/block.json.domain';
import { extractBlockLinkTargets } from '../../domain/block.link.domain';
import { writeCreatedText } from '../../domain/block.operation.domain';
import type { BlockLinkDraft, BlockTextEngine, WorkingBlock } from '../../domain/block.transaction.domain.types';
import {
  BLOCK_MIGRATION_INITIAL_VERSION,
  BLOCK_MIGRATION_LIFECYCLE,
  BLOCK_MIGRATION_NO_PAGE_COLUMNS,
  BLOCK_MIGRATION_PROBLEM,
} from '../constants/block.migration.constants';
import type {
  BlockIdRemapsByPage,
  BlockMigrationProblem,
  ConvertedPage,
  MigratedBlock,
  MigratedPage,
  MigrationPage,
} from '../types/block.migration.types';
import { rewriteBlockIds } from './block.migration.remap.domain';

const describeProblem = (pageId: string, blockId: string | null, message: string): BlockMigrationProblem => ({
  blockId,
  kind: BLOCK_MIGRATION_PROBLEM.conversionFailed,
  message,
  pageId,
});

/** The page document with its remapped ids, split into one page block and one block per document block. */
export const convertPage = (
  page: MigrationPage,
  remaps: BlockIdRemapsByPage,
): Result<ConvertedPage, BlockMigrationProblem> => {
  const content = rewriteBlockIds(page.content, page.id, remaps);
  if (content.isFail()) return Result.fail(describeProblem(page.id, null, content.getError().message));
  const tree = documentToBlocks({
    content: content.getValue(),
    cover: page.cover,
    icon: page.icon,
    pageId: page.id,
    parentId: page.parentId,
    propertyValues: page.propertyValues,
    spaceId: page.spaceId,
    title: page.title,
  });
  if (tree.isFail()) return Result.fail(describeProblem(page.id, null, tree.getError().message));
  return Result.ok({ content: content.getValue(), tree: tree.getValue() });
};

export const listAllDrafts = (tree: BlockTree): readonly BlockDraft[] => [tree.page, ...tree.blocks];

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The path of the first place two JSON values differ, without the values, which may be text of a page. */
export const findFirstDifferencePath = (first: unknown, second: unknown, path = '$'): string | null => {
  if (isSameJson(first, second)) return null;
  if (Array.isArray(first) && Array.isArray(second)) {
    const length = Math.max(first.length, second.length);
    for (let index = 0; index < length; index += 1) {
      const inner = findFirstDifferencePath(first[index], second[index], `${path}[${String(index)}]`);
      if (inner !== null) return inner;
    }
    return path;
  }
  if (isPlainRecord(first) && isPlainRecord(second)) {
    const keys = [...new Set([...Object.keys(first), ...Object.keys(second)])];
    for (const key of keys) {
      const inner = findFirstDifferencePath(first[key], second[key], `${path}.${key}`);
      if (inner !== null) return inner;
    }
  }
  return path;
};

const withoutDerivedId = (stored: Record<string, unknown>, rebuilt: Record<string, unknown>): unknown => {
  const rebuiltAttributes = rebuilt.attrs;
  const hasStoredId = isPlainRecord(stored.attrs) && stored.attrs.id !== undefined;
  if (hasStoredId || !isPlainRecord(rebuiltAttributes)) return rebuilt;
  const { id: _derivedId, ...others } = rebuiltAttributes;
  const { attrs: _attributes, ...node } = rebuilt;
  return Object.keys(others).length === 0 ? node : { ...node, attrs: others };
};

/**
 * Normalization: a node stored without an id comes back with the id derived from its place, so that id is dropped
 * from the rebuilt document before the two are compared. Everything else must match exactly.
 */
export const normalizeRebuiltDocument = (stored: unknown, rebuilt: unknown): unknown => {
  if (Array.isArray(stored) && Array.isArray(rebuilt)) {
    return rebuilt.map((node: unknown, index) => normalizeRebuiltDocument(stored[index], node));
  }
  if (!isPlainRecord(stored) || !isPlainRecord(rebuilt)) return rebuilt;
  const node =
    isPlainRecord(rebuilt) && typeof rebuilt.type === 'string' && rebuilt.type !== 'doc'
      ? withoutDerivedId(stored, rebuilt)
      : rebuilt;
  if (!isPlainRecord(node) || !Array.isArray(node.content)) return node;
  return { ...node, content: normalizeRebuiltDocument(stored.content, node.content) };
};

export const isEquivalentDocument = (stored: unknown, rebuilt: unknown): boolean =>
  isSameJson(stored, normalizeRebuiltDocument(stored, rebuilt));

/** Null when the blocks give back the document they came from, up to the normalization above. */
export const findRoundTripProblem = (page: MigrationPage, converted: ConvertedPage): BlockMigrationProblem | null => {
  const rebuilt = blocksToDocument(converted.tree.page, converted.tree.blocks);
  const differsAt = rebuilt.isOk()
    ? findFirstDifferencePath(converted.content, normalizeRebuiltDocument(converted.content, rebuilt.getValue()))
    : null;
  const message = rebuilt.isFail()
    ? rebuilt.getError().message
    : `The document rebuilt from its blocks differs from the stored one at ${differsAt ?? '$'}`;
  const isSame = rebuilt.isOk() && isEquivalentDocument(converted.content, rebuilt.getValue());
  return isSame ? null : { blockId: null, kind: BLOCK_MIGRATION_PROBLEM.roundTripMismatch, message, pageId: page.id };
};

const readPageColumns = (page: MigrationPage): Omit<MigratedBlock, keyof WorkingBlock> => ({
  lockedById: page.lockedById,
  ownerId: page.ownerId,
  purgeAfter: page.purgeAfter,
  trashedAt: page.trashedAt,
  verificationExpiresAt: page.verificationExpiresAt,
  verifiedAt: page.verifiedAt,
  verifiedById: page.verifiedById,
});

const toWorkingBlock = (page: MigrationPage, draft: BlockDraft, children: readonly string[]): WorkingBlock => {
  const isPage = draft.id === page.id;
  return {
    alive: true,
    children,
    createdAt: page.createdAt,
    createdById: page.createdById,
    editedAt: page.updatedAt,
    editedById: page.updatedById,
    format: draft.format,
    id: draft.id,
    lifecycle: isPage ? page.lifecycle : BLOCK_MIGRATION_LIFECYCLE.active,
    lockedAt: isPage ? page.lockedAt : null,
    parentId: draft.parentId,
    permissions: null,
    properties: draft.properties,
    spaceId: draft.spaceId,
    text: '',
    textState: null,
    type: draft.type,
    version: BLOCK_MIGRATION_INITIAL_VERSION,
  };
};

const buildMigratedBlock = (
  page: MigrationPage,
  draft: BlockDraft,
  children: readonly string[],
  engine: BlockTextEngine,
): Result<MigratedBlock, BlockMigrationProblem> => {
  const written = writeCreatedText(toWorkingBlock(page, draft, children), engine);
  if (written.isFail()) {
    return Result.fail(
      describeProblem(page.id, draft.id, `The text state could not be built: ${written.getError().message}`),
    );
  }
  const { format, properties, type } = written.getValue();
  const content = parseBlockContent(type, properties, format);
  if (content.isFail()) {
    return Result.fail(
      describeProblem(page.id, draft.id, 'The block content is not valid once its text state was built'),
    );
  }
  const extras = draft.id === page.id ? readPageColumns(page) : BLOCK_MIGRATION_NO_PAGE_COLUMNS;
  return Result.ok({ ...written.getValue(), ...extras, text: readBlockText(content.getValue()) });
};

/** The links the blocks of the page send, with the page as their source page. */
export const listPageLinkDrafts = (page: MigrationPage, tree: BlockTree): BlockLinkDraft[] =>
  listAllDrafts(tree).flatMap((draft) =>
    extractBlockLinkTargets(draft.id, draft).map((target) => ({
      kind: target.kind,
      sourceBlockId: draft.id,
      sourcePageId: page.id,
      targetBlockId: target.targetBlockId,
    })),
  );

/**
 * The rows of one page: its page block, listing its own blocks and then its child pages in sibling order, and one
 * row per block, each with the Yjs state of its rich text built by the engine the transactions use.
 */
export const buildMigratedPage = (
  page: MigrationPage,
  converted: ConvertedPage,
  childPageIds: readonly string[],
  engine: BlockTextEngine,
): Result<MigratedPage, BlockMigrationProblem> => {
  const drafts = listAllDrafts(converted.tree);
  const rows: MigratedBlock[] = [];
  for (const draft of drafts) {
    const children = draft.id === page.id ? [...draft.children, ...childPageIds] : draft.children;
    const row = buildMigratedBlock(page, draft, children, engine);
    if (row.isFail()) return Result.fail(row.getError());
    rows.push(row.getValue());
  }
  const [pageRow, ...blockRows] = rows;
  if (pageRow === undefined) return Result.fail(describeProblem(page.id, null, 'No page block was built'));
  return Result.ok({ blocks: blockRows, links: listPageLinkDrafts(page, converted.tree), page: pageRow });
};
