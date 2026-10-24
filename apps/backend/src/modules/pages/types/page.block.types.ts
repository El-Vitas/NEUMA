import type { PageLifecycle } from '@neuma/db';
import type { BlockViewer, UserRole } from '@neuma/shared';
import type { PageAccessProfile } from '../domain/page.access.domain.types';
import type { PageContentBlock } from '../domain/page.block.domain.types';
import type { StoredPageBlock } from './page.types';

/** A page block as the statement returns it: the array and permission columns are still to be narrowed. */
export interface PageBlockRow extends Omit<StoredPageBlock, 'children' | 'permissions'> {
  readonly children: unknown;
  readonly permissions: unknown;
}

/** Templates are pages of the collection that are not part of any listing (ADR 027): ask for them to carry them. */
export interface PageListingOptions {
  readonly includeTemplates?: boolean;
}

/** The few columns that tell whether a page can be listed under its parent, read without the rest of the block. */
export interface PageHead {
  readonly id: string;
  readonly lifecycle: PageLifecycle;
  readonly parentId: null | string;
  readonly permissions: unknown;
  readonly properties: unknown;
}

/** A page whose deadline passed, and the page that holds it. */
export interface PageDueForPurge {
  readonly id: string;
  readonly parentId: null | string;
  readonly spaceId: string;
}

export interface PageUser {
  readonly id: string;
  readonly name: string;
}

export interface PageLastEdit {
  readonly at: Date;
  readonly byId: string;
}

/** What a summary needs besides the page block, read once for all the pages of a read. */
export interface PageSummaryParts {
  readonly contents: ReadonlyMap<string, readonly PageContentBlock[]>;
  readonly positions: ReadonlyMap<string, number>;
  readonly users: ReadonlyMap<string, PageUser>;
  readonly versions: ReadonlyMap<string, number>;
}

/** The reader of a page: whose eyes the visibility of every page is judged with. */
export interface PageViewer {
  readonly role: UserRole;
  readonly userId: string;
  readonly workspaceId: string;
}

/** A page the viewer may read, with what the chain above it says about it. */
export interface AccessiblePage {
  readonly access: PageAccessProfile;
  /** The eyes the page was judged with, so what it shows is cut by the same permissions. */
  readonly viewer: BlockViewer;
  readonly block: StoredPageBlock;
}
