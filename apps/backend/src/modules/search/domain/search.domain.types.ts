import type { JsonValue } from '@neuma/db';
import type { BlockPermissions } from '@neuma/shared';

/** A result is a block, or a page standing for the best block it holds. */
export type SearchGranularity = 'block' | 'page';

/** An ancestor that declares permissions, with how far above the matched block it sits (0 is the block itself). */
export interface DeclaringAncestor {
  readonly depth: number;
  readonly id: string;
  readonly permissions: NonNullable<BlockPermissions>;
}

export interface HeadingEntry {
  readonly level: number;
  readonly text: string;
}

/** A matched block with what is needed to decide whether the viewer may see it. */
export interface SearchCandidate {
  readonly blockId: string;
  readonly blockType: string;
  /** Declaring ancestors, nearest first. */
  readonly chain: readonly DeclaringAncestor[];
  readonly editedAt: Date;
  readonly headings: readonly HeadingEntry[];
  readonly icon: JsonValue;
  readonly isPageVerified: boolean;
  /** Declaring ancestors from the page upward: what decides whether the viewer may see the page at all. */
  readonly pageChain: readonly DeclaringAncestor[];
  readonly pageId: string;
  readonly pageParentId: string | null;
  /** Rank of the best match of the page, whoever reads it: where the page sits in the order. */
  readonly pageRank: number;
  readonly pageTitle: string;
  readonly parentPageTitle: string | null;
  readonly rank: number;
  readonly snippet: string;
  readonly spaceId: string;
  readonly spaceName: string;
}

export interface ReadableSlice {
  /** More readable rows were fetched than the page has room for, so a next page certainly exists. */
  readonly hasSurplus: boolean;
  readonly taken: readonly SearchCandidate[];
}
