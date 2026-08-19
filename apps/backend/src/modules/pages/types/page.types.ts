import type { PageLifecycle } from '@company-brain/db';
import type { Prisma } from '@company-brain/db/generated';
import type { PageCoverValue, PageIcon, UserRole } from '@company-brain/shared';
import type { SchemaPropertyValues } from '../../../common/domain/schema.domain.types';
import { PAGE_DELETE_FOREVER_OUTCOMES } from '../constants/pages.constants';
import type { PageParentReference } from '../domain/page.domain.types';

export type PageDeleteForeverOutcome = (typeof PAGE_DELETE_FOREVER_OUTCOMES)[number];

export interface PageHierarchyRow extends PageParentReference {
  readonly lifecycle: PageLifecycle;
  readonly title: string;
  readonly trashedAt: Date | null;
  readonly updatedById: string;
}

export interface CreatePageInput {
  readonly content: Prisma.InputJsonValue;
  readonly createdById: string;
  readonly parentId: null | string;
  readonly propertyValues: SchemaPropertyValues | null;
  readonly role: UserRole;
  readonly spaceId: string;
  readonly title: string;
  readonly userId: string;
  readonly workspaceId: string;
}

export interface UpdatePageInput {
  readonly content: Prisma.InputJsonValue;
  readonly pageId: string;
  readonly propertyValues: SchemaPropertyValues | null;
  readonly role: UserRole;
  readonly title: string;
  readonly updatedById: string;
  readonly userId: string;
  readonly workspaceId: string;
}

export interface PageSummary {
  readonly content: Prisma.JsonValue;
  readonly cover?: PageCoverValue | null;
  readonly createdAt: Date;
  readonly createdBy: null | { readonly id: string; readonly name: string };
  readonly icon?: PageIcon | null;
  readonly id: string;
  readonly lifecycle: PageLifecycle;
  /** When somebody locked the page against edits, and nothing when nobody has. */
  readonly lockedAt: Date | null;
  readonly order: number;
  readonly parentId: null | string;
  readonly propertyValues: SchemaPropertyValues | null;
  readonly spaceId: string;
  readonly title: string;
  readonly updatedAt: Date;
  readonly updatedBy: null | { readonly id: string; readonly name: string };
  readonly version: number;
}

export interface PageMoveContext {
  readonly pageId: string;
  readonly pages: readonly PageParentReference[];
  readonly propertyValues: SchemaPropertyValues | null;
  /** Where the page lives now, which is not always where it is going. */
  readonly spaceId: string;
  readonly title: string;
}

/**
 * Where a page may be sent: the spaces this reader can reach, and the pages of
 * those spaces it could hang from. Its own branch is left out, since a page
 * cannot come to hang from something that hangs from it.
 */
export interface PageMoveDestinations {
  readonly pages: readonly { readonly id: string; readonly spaceId: string; readonly title: string }[];
  readonly spaces: readonly { readonly id: string; readonly name: string }[];
}

/** What a page is copied from: everything it wears and everything it says, as it sits in the database. */
export interface PageCopySource {
  readonly content: Prisma.JsonValue;
  readonly cover: Prisma.JsonValue;
  readonly icon: Prisma.JsonValue;
  readonly propertyValues: Prisma.JsonValue;
  readonly spaceId: string;
}

export interface DuplicatePageInput {
  readonly includeChildren: boolean;
  readonly pageId: string;
  readonly role: UserRole;
  readonly title: null | string;
  readonly userId: string;
  readonly workspaceId: string;
}

export interface PageListOptions {
  readonly includeTrashed: boolean;
}

export interface PageDescendantsPreview {
  readonly childPageCount: number;
}

export interface PageRestoreOutcome {
  readonly restoredChildCount: number;
  readonly restoredToRoot: boolean;
}

export interface PageAttachmentsCleanupRepositoryContract {
  readonly deleteForPages: (pageIds: readonly string[]) => Promise<void>;
  readonly listStorageKeysForPages: (pageIds: readonly string[]) => Promise<readonly string[]>;
}

export interface TrashedPageSummary {
  readonly deletedAt: Date;
  readonly deletedBy: null | { readonly id: string; readonly name: string };
  readonly id: string;
  readonly parentId: null | string;
  readonly spaceId: string;
  readonly title: string;
  readonly trashedChildCount: number;
}

export interface PageRepositoryContract {
  readonly countDescendantsByLifecycle: (
    pageId: string,
    lifecycle: PageLifecycle,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<null | number>;
  readonly create: (input: CreatePageInput) => Promise<PageSummary | null>;
  readonly duplicate: (input: DuplicatePageInput) => Promise<PageSummary | null>;
  readonly deleteForever: (
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<PageDeleteForeverOutcome>;
  readonly emptyTrash: (
    workspaceId: string,
    userId: string,
    role: UserRole,
    spaceId: null | string,
  ) => Promise<readonly string[]>;
  readonly findReadablePageIds: (
    pageIds: readonly string[],
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<readonly string[]>;
  readonly getAccessible: (
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<PageSummary | null>;
  readonly findMoveContext: (
    pageId: string,
    targetSpaceId: null | string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<PageMoveContext | null>;
  readonly listWithProperties: (workspaceId: string, userId: string, role: UserRole) => Promise<readonly PageSummary[]>;
  readonly listMoveDestinations: (
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<PageMoveDestinations | null>;
  readonly listTrashed: (
    workspaceId: string,
    userId: string,
    role: UserRole,
    spaceId: null | string,
    search: null | string,
  ) => Promise<readonly TrashedPageSummary[]>;
  readonly move: (
    pageId: string,
    parentId: null | string,
    targetSpaceId: string,
    userId: string,
    workspaceId: string,
    role: UserRole,
    mutationId: string,
  ) => Promise<PageSummary | null>;
  readonly parentBelongsToSpace: (parentId: string, spaceId: string) => Promise<boolean>;
  readonly listAccessible: (
    spaceId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
    includeTrashed: boolean,
  ) => Promise<readonly PageSummary[]>;
  readonly restoreCascade: (
    pageId: string,
    userId: string,
    workspaceId: string,
    role: UserRole,
    mutationId: string,
    includeChildren: boolean,
  ) => Promise<null | PageRestoreOutcome>;
  readonly trashCascade: (
    pageId: string,
    userId: string,
    workspaceId: string,
    role: UserRole,
    mutationId: string,
  ) => Promise<boolean>;
  readonly update: (input: UpdatePageInput) => Promise<PageSummary | null>;
  readonly rename: (
    pageId: string,
    title: string,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ) => Promise<PageSummary | null>;
  readonly setLocked: (
    pageId: string,
    locked: boolean,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ) => Promise<PageSummary | null>;
  readonly updateCover: (
    pageId: string,
    cover: PageCoverValue | null,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ) => Promise<PageSummary | null>;
  readonly updateIcon: (
    pageId: string,
    icon: PageIcon | null,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ) => Promise<PageSummary | null>;
}
