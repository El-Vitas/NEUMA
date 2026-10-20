import { BLOCK_MIGRATION_PROBLEM } from '../constants/block.migration.constants';
import type {
  BlockIdRemapsByPage,
  BlockMigrationProblem,
  InspectionTotals,
  MigrationPage,
  PageInspection,
} from '../types/block.migration.types';
import { convertPage, findRoundTripProblem, listPageLinkDrafts } from './block.migration.conversion.domain';

export const createInspectionTotals = (): InspectionTotals => ({
  alreadyMigratedPageCount: 0,
  blockCount: 0,
  danglingLinkCount: 0,
  linkCount: 0,
  problems: [],
  targetCounts: new Map(),
});

/** What one sync read of the page returns: its content blocks, the page itself and its child pages as rows. */
export const countBlocksOfRead = (contentBlockCount: number, childPageIds: readonly string[] | undefined): number =>
  contentBlockCount + 1 + (childPageIds?.length ?? 0);

export const describeOversizedPage = (
  pageId: string,
  readCount: number,
  maxPageBlocks: number,
): BlockMigrationProblem => ({
  blockId: null,
  kind: BLOCK_MIGRATION_PROBLEM.pageTooLarge,
  message: `A read of the page returns ${String(readCount)} blocks and sync allows at most ${String(maxPageBlocks)}`,
  pageId,
});

/** The ids of a page not yet migrated that some other stored block already holds. */
export const listTakenBlockIds = (
  pageId: string,
  blockIds: readonly string[],
  existing: ReadonlySet<string>,
): BlockMigrationProblem[] =>
  blockIds
    .filter((blockId) => existing.has(blockId))
    .map((blockId) => ({
      blockId,
      kind: BLOCK_MIGRATION_PROBLEM.idTakenByExistingBlock,
      message: 'A block with this id is already stored and does not belong to this page',
      pageId,
    }));

const describeDuplicate = (pageId: string, blockId: string, ownerPageId: string): BlockMigrationProblem => ({
  blockId,
  kind: BLOCK_MIGRATION_PROBLEM.unresolvedDuplicateId,
  message: `The block id is also used by the page ${ownerPageId} and could not be given a new one`,
  pageId,
});

/** Registers the ids of the page in `owners`; an id another page owns is a problem the remap did not solve. */
const claimConvertedIds = (
  page: MigrationPage,
  blockIds: readonly string[],
  owners: Map<string, string>,
): BlockMigrationProblem[] => {
  const problems: BlockMigrationProblem[] = [];
  for (const blockId of blockIds) {
    const ownerPageId = owners.get(blockId);
    if (ownerPageId === undefined) owners.set(blockId, page.id);
    else if (ownerPageId !== page.id) problems.push(describeDuplicate(page.id, blockId, ownerPageId));
  }
  return problems;
};

/**
 * Converts one page with its remapped ids and says what is wrong with it: a conversion that fails, a document the
 * blocks do not give back, an id that is still shared. `owners` carries the ids claimed by the pages already visited.
 */
export const inspectPage = (
  page: MigrationPage,
  remaps: BlockIdRemapsByPage,
  owners: Map<string, string>,
): PageInspection => {
  const converted = convertPage(page, remaps);
  if (converted.isFail()) {
    return { blockIds: [], converted: null, linkTargetIds: [], problems: [converted.getError()] };
  }
  const { tree } = converted.getValue();
  const blockIds = tree.blocks.map((block) => block.id);
  const roundTrip = findRoundTripProblem(page, converted.getValue());
  return {
    blockIds,
    converted: converted.getValue(),
    linkTargetIds: listPageLinkDrafts(page, tree).map((link) => link.targetBlockId),
    problems: [...(roundTrip === null ? [] : [roundTrip]), ...claimConvertedIds(page, blockIds, owners)],
  };
};
