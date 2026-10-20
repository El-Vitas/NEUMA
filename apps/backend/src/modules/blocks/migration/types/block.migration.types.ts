import type { BlockDocumentPropertyValues, BlockTree, PageContent, PageCoverValue, PageIcon } from '@neuma/shared';
import type { BlockLifecycle } from '../../domain/block.domain.types';
import type { BlockLinkDraft, WorkingBlock } from '../../domain/block.transaction.domain.types';
import type { StoredBlockRow } from '../../types/blocks.types';
import type { BLOCK_MIGRATION_MODE, BLOCK_MIGRATION_PROBLEM } from '../constants/block.migration.constants';

export type JsonRecord = Record<string, unknown>;

export type BlockMigrationMode = (typeof BLOCK_MIGRATION_MODE)[keyof typeof BLOCK_MIGRATION_MODE];

export type BlockMigrationProblemKind = (typeof BLOCK_MIGRATION_PROBLEM)[keyof typeof BLOCK_MIGRATION_PROBLEM];

/** Ids and messages only, never text from a page, so a log or a report carries nothing personal. */
export interface BlockMigrationProblem {
  readonly blockId: string | null;
  readonly kind: BlockMigrationProblemKind;
  readonly message: string;
  readonly pageId: string;
}

/** What the order of the tree needs of a page; the content stays in the database until the page is converted. */
export interface MigrationPageNode {
  readonly createdAt: Date;
  readonly id: string;
  readonly order: number;
  readonly parentId: string | null;
  readonly spaceId: string;
}

interface MigrationPageColumns extends MigrationPageNode {
  readonly createdById: string;
  readonly lifecycle: BlockLifecycle;
  readonly lockedAt: Date | null;
  readonly lockedById: string | null;
  readonly ownerId: string | null;
  readonly purgeAfter: Date | null;
  readonly title: string;
  readonly trashedAt: Date | null;
  readonly updatedAt: Date;
  readonly updatedById: string;
  readonly verificationExpiresAt: Date | null;
  readonly verifiedAt: Date | null;
  readonly verifiedById: string | null;
}

/** A page row as the database returns it: the JSON columns are still to be checked. */
export interface MigrationPageRow extends MigrationPageColumns {
  readonly content: unknown;
  readonly cover: unknown;
  readonly icon: unknown;
  readonly propertyValues: unknown;
}

/** A page whose JSON columns were checked against the schemas of the shared page block. */
export interface MigrationPage extends MigrationPageColumns {
  readonly content: PageContent;
  readonly cover: PageCoverValue | null;
  readonly icon: PageIcon | null;
  readonly propertyValues: BlockDocumentPropertyValues | null;
}

/** The pages of one space visited together, in the order of the hierarchy. */
export interface PageBatch {
  readonly pageIds: readonly string[];
  readonly rows: readonly MigrationPageRow[];
  readonly spaceId: string;
}

export interface SpaceTree {
  readonly orderedPageIds: readonly string[];
  readonly spaceId: string;
}

export interface MigrationHierarchy {
  /** The child pages of each page, in the order of `Page.order`. */
  readonly childPageIdsByParent: ReadonlyMap<string, readonly string[]>;
  readonly problems: readonly BlockMigrationProblem[];
  /** Every space with its pages, a parent always before its children. */
  readonly spaces: readonly SpaceTree[];
}

export interface BlockIdRemap {
  readonly newBlockId: string;
  readonly oldBlockId: string;
  readonly ownerPageId: string;
  readonly pageId: string;
}

export type BlockIdRemapsByPage = ReadonlyMap<string, ReadonlyMap<string, string>>;

/** A page document with the remapped ids written in, and the blocks it becomes. */
export interface ConvertedPage {
  readonly content: PageContent;
  readonly tree: BlockTree;
}

/** What converting one page showed: its block ids, where its links point and what is wrong with it. */
export interface PageInspection {
  readonly blockIds: readonly string[];
  readonly converted: ConvertedPage | null;
  readonly linkTargetIds: readonly string[];
  readonly problems: readonly BlockMigrationProblem[];
}

/** The counts the check keeps while it walks the pages; the one place in the migration that is mutated as it goes. */
export interface InspectionTotals {
  alreadyMigratedPageCount: number;
  blockCount: number;
  danglingLinkCount: number;
  linkCount: number;
  problems: BlockMigrationProblem[];
  /** How many links point at each target, to find the ones whose target does not exist. */
  readonly targetCounts: Map<string, number>;
}

export interface InspectionLimits {
  readonly childPageIdsByParent: ReadonlyMap<string, readonly string[]>;
  readonly maxPageBlocks: number;
}

export interface RemapCollection {
  readonly failedPageIds: ReadonlySet<string>;
  readonly problems: readonly BlockMigrationProblem[];
  readonly remaps: readonly BlockIdRemap[];
}

export interface MigrationPlan {
  readonly hierarchy: MigrationHierarchy;
  readonly remapsByPage: BlockIdRemapsByPage;
  readonly report: BlockMigrationCheckReport;
}

/** A block ready to insert: the working block plus the page columns a block row also carries. */
export interface MigratedBlock extends WorkingBlock {
  readonly lockedById: string | null;
  readonly ownerId: string | null;
  readonly purgeAfter: Date | null;
  readonly trashedAt: Date | null;
  readonly verificationExpiresAt: Date | null;
  readonly verifiedAt: Date | null;
  readonly verifiedById: string | null;
}

export interface MigratedPage {
  readonly blocks: readonly MigratedBlock[];
  readonly links: readonly BlockLinkDraft[];
  readonly page: MigratedBlock;
}

/** The columns verification reads from a stored block row. */
export interface StoredBlockColumns extends StoredBlockRow {
  readonly lockedById: string | null;
  readonly ownerId: string | null;
  readonly purgeAfter: Date | null;
  readonly textState: Uint8Array | null;
  readonly trashedAt: Date | null;
  readonly verificationExpiresAt: Date | null;
  readonly verifiedAt: Date | null;
  readonly verifiedById: string | null;
}

/** A stored block with the text state, as verification reads it. */
export interface StoredMigrationBlock extends MigratedBlock {
  readonly pageId: string;
}

export interface StoredPageBlocks {
  readonly blocks: readonly StoredMigrationBlock[];
  readonly page: StoredMigrationBlock;
}

export interface BlockMigrationCheckReport {
  readonly alreadyMigratedPageCount: number;
  readonly blockCount: number;
  readonly danglingLinkCount: number;
  readonly isClean: boolean;
  readonly linkCount: number;
  readonly pageCount: number;
  readonly problems: readonly BlockMigrationProblem[];
  readonly remaps: readonly BlockIdRemap[];
}

export interface BlockMigrationVerifyReport {
  readonly blockCount: number;
  readonly isClean: boolean;
  readonly linkCount: number;
  readonly pageCount: number;
  readonly problems: readonly BlockMigrationProblem[];
}

/** What the write phase keeps while it walks the pages. */
export interface WriteTotals {
  insertedBlockCount: number;
  migratedPageCount: number;
  problems: BlockMigrationProblem[];
  skippedPageCount: number;
}

export interface VerifyTotals {
  blockCount: number;
  linkCount: number;
  pageCount: number;
  problems: BlockMigrationProblem[];
}

export interface BlockMigrationApplyReport {
  readonly check: BlockMigrationCheckReport;
  readonly insertedBlockCount: number;
  readonly insertedLinkCount: number;
  readonly isApplied: boolean;
  readonly migratedPageCount: number;
  /** Problems met while writing, after the check passed. */
  readonly problems: readonly BlockMigrationProblem[];
  readonly skippedPageCount: number;
  readonly verify: BlockMigrationVerifyReport | null;
}
