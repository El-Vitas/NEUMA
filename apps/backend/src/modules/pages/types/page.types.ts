import type { PageLifecycle } from '@company-brain/db';
import type { Prisma } from '@company-brain/db/generated';
import type { PageContent, PageCoverValue, PageIcon, Result, UserRole } from '@company-brain/shared';
import type { SchemaPropertyValues } from '../../../common/domain/schema.domain.types';
import { PAGE_CONTENT_STORE_OUTCOME, PAGE_DELETE_FOREVER_OUTCOMES } from '../constants/pages.constants';
import type { PageParentReference } from '../domain/page.domain.types';
import type {
  PageAccessDeniedError,
  PageContentValidationError,
  PageLifecycleError,
  PageLockedError,
} from '../domain/page.error';

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

export interface StorePageContentInput {
  readonly content: PageContent;
  readonly pageId: string;
  readonly updatedById: string;
}

export type PageContentStoreOutcome = (typeof PAGE_CONTENT_STORE_OUTCOME)[keyof typeof PAGE_CONTENT_STORE_OUTCOME];

export interface StoredPageContentRow {
  readonly content: Prisma.JsonValue;
  readonly title: string;
}

export interface UpdatePagePropertyValuesInput {
  readonly pageId: string;
  /** Saved in the same write; omitted leaves the title untouched. */
  readonly title?: string;
  readonly updatedById: string;
}

/** Must stay pure: it runs under the row lock, and a query would take a second connection. */
export type PagePropertyValuesMerge<TError> = (
  current: SchemaPropertyValues | null,
) => Result<SchemaPropertyValues | null, TError>;

export interface StoredPagePropertyValuesRow {
  readonly propertyValues: Prisma.JsonValue;
}

export type PageContentRewrite = (current: PageContent) => PageContent;

export type PageContentEdit = (current: PageContent) => Result<PageContent, string>;

export interface PageWriteAuthorizer {
  readonly authorizeContentWrite: (
    writer: PageContentWriter,
    content: unknown,
  ) => Promise<Result<PageContent, PageContentWriteError>>;
  readonly authorizeWrite: (
    writer: PageContentWriter,
  ) => Promise<Result<PageContentWriter, PageAccessDeniedError | PageLifecycleError | PageLockedError>>;
}

export type PageContentWriteError =
  | PageAccessDeniedError
  | PageContentValidationError
  | PageLifecycleError
  | PageLockedError;

export interface PageLiveDocument {
  /** Null when nobody has the document open. */
  readonly readLoadedPageContent: (pageId: string) => PageContent | null;
  readonly writePageContent: (writer: PageContentWriter, rewrite: PageContentRewrite) => Promise<PageContent>;
}

export interface PageContentWriter {
  readonly pageId: string;
  readonly role: UserRole;
  /** The space named in the address; a page in another space is rejected. */
  readonly spaceId: string;
  readonly userId: string;
  readonly workspaceId: string;
}

export interface UpdatePagePropertiesInput {
  readonly pageId: string;
  readonly propertyValues: Readonly<Record<string, unknown>>;
  readonly role: UserRole;
  /** Saved in the same write as the properties so both land or neither does. */
  readonly title?: string;
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
  readonly lockedAt: Date | null;
  readonly order: number;
  readonly owner: null | { readonly id: string; readonly name: string };
  readonly parentId: null | string;
  readonly propertyValues: SchemaPropertyValues | null;
  readonly spaceId: string;
  readonly title: string;
  readonly updatedAt: Date;
  readonly updatedBy: null | { readonly id: string; readonly name: string };
  /** Null means a verified page never expires. */
  readonly verificationExpiresAt: Date | null;
  /** Expiring leaves this untouched. */
  readonly verifiedAt: Date | null;
  readonly verifiedBy: null | { readonly id: string; readonly name: string };
  readonly version: number;
}

export interface PageMoveContext {
  readonly pageId: string;
  readonly pages: readonly PageParentReference[];
  readonly propertyValues: SchemaPropertyValues | null;
  readonly spaceId: string;
  readonly title: string;
}

/** Excludes the page's own branch, since a page cannot be moved under its descendants. */
export interface PageMoveDestinations {
  readonly pages: readonly { readonly id: string; readonly spaceId: string; readonly title: string }[];
  readonly spaces: readonly { readonly id: string; readonly name: string }[];
}

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

export interface PageDescendantsPreview {
  readonly childPageCount: number;
}

export interface PageRestoreOutcome {
  readonly parentTitle: null | string;
  readonly restoredChildCount: number;
  readonly restoredToRoot: boolean;
  readonly spaceName: null | string;
}

export interface ExportedFile {
  readonly contents: string | Uint8Array;
  readonly path: string;
}

export interface CarriedAttachment {
  readonly contents: Buffer;
  readonly id: string;
  readonly path: string;
}

export interface PageLogger {
  readonly warn: (context: Record<string, unknown>) => void;
}

export interface PageAssetForExport {
  readonly id: string;
  readonly originalFilename: string;
  readonly storageKey: string;
}

export interface PageAttachmentsCleanupRepositoryContract {
  readonly deleteForPages: (pageIds: readonly string[]) => Promise<void>;
  readonly listAssetsForPages: (pageIds: readonly string[]) => Promise<readonly PageAssetForExport[]>;
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

export interface PageAccessState {
  readonly lifecycle: PageLifecycle;
  readonly lockedAt: Date | null;
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
  readonly findAccessState: (
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<PageAccessState | null>;
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
  /** A null `beforePageId` places the page last among its siblings. */
  readonly reorderAmongSiblings: (
    pageId: string,
    beforePageId: null | string,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ) => Promise<readonly PageSummary[] | null>;
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
  readonly findStoredContent: (pageId: string) => Promise<PageContent | null>;
  readonly storeContent: (input: StorePageContentInput) => Promise<PageContentStoreOutcome>;
  /** Merges under the row lock; null when the page does not exist. */
  readonly updatePropertyValues: <TError>(
    input: UpdatePagePropertyValuesInput,
    merge: PagePropertyValuesMerge<TError>,
  ) => Promise<Result<PageSummary, TError> | null>;
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
  readonly setOwner: (
    pageId: string,
    ownerId: null | string,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ) => Promise<PageSummary | null>;
  readonly setVerification: (
    pageId: string,
    verified: boolean,
    expiresAt: Date | null,
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
