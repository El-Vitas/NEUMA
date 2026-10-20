import { blocksToDocument } from '@neuma/shared';
import { isSameJson } from '../../domain/block.json.domain';
import type { BlockLinkDraft } from '../../domain/block.transaction.domain.types';
import { BLOCK_MIGRATION_COMPARED_FIELDS, BLOCK_MIGRATION_PROBLEM } from '../constants/block.migration.constants';
import type {
  BlockMigrationProblem,
  ConvertedPage,
  MigratedBlock,
  MigratedPage,
  MigrationPage,
  StoredPageBlocks,
} from '../types/block.migration.types';
import { isEquivalentDocument } from './block.migration.conversion.domain';

const describeMismatch = (pageId: string, blockId: string | null, message: string): BlockMigrationProblem => ({
  blockId,
  kind: BLOCK_MIGRATION_PROBLEM.storedMismatch,
  message,
  pageId,
});

const isSameValue = (first: unknown, second: unknown): boolean =>
  first instanceof Date && second instanceof Date ? first.getTime() === second.getTime() : isSameJson(first, second);

/** The names of the columns where the stored block is not the one the migration would write. */
const listDifferentFields = (expected: MigratedBlock, stored: MigratedBlock): string[] =>
  BLOCK_MIGRATION_COMPARED_FIELDS.filter((field) => !isSameValue(expected[field], stored[field]));

const compareRows = (pageId: string, expected: MigratedPage, stored: StoredPageBlocks): BlockMigrationProblem[] => {
  const storedById = new Map([stored.page, ...stored.blocks].map((row) => [row.id, row]));
  return [expected.page, ...expected.blocks].flatMap((row) => {
    const found = storedById.get(row.id);
    if (found === undefined) return [describeMismatch(pageId, row.id, 'The block is missing')];
    const differences = listDifferentFields(row, found);
    const hasStateMismatch = (row.textState === null) !== (found.textState === null);
    const fields = hasStateMismatch ? [...differences, 'textState'] : differences;
    return fields.length === 0
      ? []
      : [describeMismatch(pageId, row.id, `The stored block differs in: ${fields.join(', ')}`)];
  });
};

const compareDocument = (
  page: MigrationPage,
  converted: ConvertedPage,
  stored: StoredPageBlocks,
): BlockMigrationProblem[] => {
  const storedIds = new Set(stored.blocks.map((row) => row.id));
  const ownChildren = stored.page.children.filter((childId) => storedIds.has(childId));
  const rebuilt = blocksToDocument({ ...stored.page, children: ownChildren }, stored.blocks);
  if (rebuilt.isFail()) return [describeMismatch(page.id, null, rebuilt.getError().message)];
  return isEquivalentDocument(converted.content, rebuilt.getValue())
    ? []
    : [describeMismatch(page.id, null, 'The document rebuilt from the stored blocks differs from the stored page')];
};

/**
 * What differs between a page and its stored blocks: the counts, every column of every row, and the document the
 * blocks give back against the page document.
 */
export const comparePageWithStoredBlocks = (
  page: MigrationPage,
  converted: ConvertedPage,
  expected: MigratedPage,
  stored: StoredPageBlocks | null,
): BlockMigrationProblem[] => {
  if (stored === null) return [describeMismatch(page.id, null, 'The page block is missing')];
  const countProblems =
    expected.blocks.length === stored.blocks.length
      ? []
      : [
          describeMismatch(
            page.id,
            null,
            `The page has ${String(expected.blocks.length)} blocks and ${String(stored.blocks.length)} are stored`,
          ),
        ];
  return [...countProblems, ...compareRows(page.id, expected, stored), ...compareDocument(page, converted, stored)];
};

export const groupLinksByPage = (links: readonly BlockLinkDraft[]): Map<string, BlockLinkDraft[]> => {
  const byPage = new Map<string, BlockLinkDraft[]>();
  for (const link of links) byPage.set(link.sourcePageId, [...(byPage.get(link.sourcePageId) ?? []), link]);
  return byPage;
};

const toLinkKey = (link: BlockLinkDraft): string =>
  [link.sourceBlockId, link.targetBlockId, link.kind, link.sourcePageId].join('|');

/** The links a page should have against the ones stored, by source, target and kind. */
export const compareLinks = (
  pageId: string,
  expected: readonly BlockLinkDraft[],
  stored: readonly BlockLinkDraft[],
): BlockMigrationProblem[] => {
  const storedKeys = new Set(stored.map(toLinkKey));
  const expectedKeys = new Set(expected.map(toLinkKey));
  const missing = expected.filter((link) => !storedKeys.has(toLinkKey(link)));
  const extra = stored.filter((link) => !expectedKeys.has(toLinkKey(link)));
  return [
    ...missing.map((link) =>
      describeMismatch(pageId, link.sourceBlockId, `The ${link.kind} link to ${link.targetBlockId} is missing`),
    ),
    ...extra.map((link) =>
      describeMismatch(pageId, link.sourceBlockId, `The ${link.kind} link to ${link.targetBlockId} should not exist`),
    ),
  ];
};
