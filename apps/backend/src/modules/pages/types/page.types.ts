import type { JsonValue, PageLifecycle } from '@neuma/db';
import type { PageContent, PageCoverValue, PageIcon, PageTemplateMarker, Result, UserRole } from '@neuma/shared';
import type { SchemaPropertyValues } from '../../../common/domain/schema.domain.types';
import { PAGE_DELETE_FOREVER_OUTCOMES, PAGE_RESTORE_VERSION_OUTCOME } from '../constants/pages.constants';
import type { PageBlockOperation } from '../domain/page.block.domain.types';
import type { PageParentReference } from '../domain/page.domain.types';
import type {
  PageAccessDeniedError,
  PageContentValidationError,
  PageLifecycleError,
  PageLockedError,
} from '../domain/page.error';
import type { PageValueListChanges } from '../domain/page-value-list.domain.types';
import type { PageViewer } from './page.block.types';
import type { PageRowTemplate } from './page-template.types';

export type PageDeleteForeverOutcome = (typeof PAGE_DELETE_FOREVER_OUTCOMES)[number];

export interface PageHierarchyRow extends PageParentReference {
  readonly lifecycle: PageLifecycle;
  readonly title: string;
  readonly trashedAt: Date | null;
  readonly updatedById: string;
}

/** A page block as the database holds it, before its title, icon and values are read out of its JSON. */
export interface StoredPageBlock {
  readonly children: readonly string[];
  readonly createdAt: Date;
  readonly createdById: string;
  readonly editedAt: Date;
  readonly editedById: string;
  readonly format: JsonValue;
  readonly id: string;
  readonly lifecycle: PageLifecycle;
  readonly lockedAt: Date | null;
  readonly ownerId: null | string;
  readonly parentId: null | string;
  readonly permissions: JsonValue;
  readonly properties: JsonValue;
  readonly purgeAfter: Date | null;
  readonly spaceId: string;
  readonly trashedAt: Date | null;
  readonly verificationExpiresAt: Date | null;
  readonly verifiedAt: Date | null;
  readonly verifiedById: null | string;
  /** The version the database keeps on the block itself, which grows with every change to it. */
  readonly version: number;
}

export interface CreatePageInput {
  readonly content: JsonValue | PageContent;
  readonly createdById: string;
  /** What a column starts with when nothing else says: under the template and under `propertyValues`. */
  readonly defaultValues?: SchemaPropertyValues;
  /** The id the page takes; a page already made under it is returned and no other is made. */
  readonly pageId?: string;
  readonly parentId: null | string;
  readonly propertyValues: SchemaPropertyValues | null;
  readonly role: UserRole;
  readonly spaceId: string;
  /** Undefined takes the default template of the collection; null asks for none. */
  readonly templateId?: null | string;
  /** The zone `@today` is read in when a template leaves a date to be filled; UTC when left out. */
  readonly timeZone?: string;
  readonly title: string;
  readonly userId: string;
  readonly workspaceId: string;
}

/** A page to write: the content is already a document, and every block of it has an id. */
export interface NewPageInput extends Omit<CreatePageInput, 'content'> {
  readonly content: PageContent;
  /** Set when the page is a template of its collection and not a row of it (ADR 027). */
  readonly template?: PageTemplateMarker;
}

export interface UpdatePagePropertyValuesInput {
  /** Operations in the wire shape that land in the same transaction as the values, such as placing a card in a view. */
  readonly extraOperations?: readonly PageBlockOperation[];
  readonly pageId: string;
  readonly role: UserRole;
  /** Saved in the same write; omitted leaves the title untouched. */
  readonly title?: string;
  readonly updatedById: string;
  readonly workspaceId: string;
}

/** Must stay pure: it decides from the values the page has when it is read. */
export type PagePropertyValuesMerge<TError> = (
  current: SchemaPropertyValues | null,
) => Result<SchemaPropertyValues | null, TError>;

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
  /** The rewrite sees the content the page has when it is read, and the result is applied as block operations. */
  readonly writeContent: (
    writer: PageContentWriter,
    rewrite: PageContentRewrite,
  ) => Promise<Result<PageContent, PageAccessDeniedError>>;
}

export type PageContentWriteError =
  | PageAccessDeniedError
  | PageContentValidationError
  | PageLifecycleError
  | PageLockedError;

export interface PageContentWriter {
  readonly pageId: string;
  readonly role: UserRole;
  /** The space named in the address; a page in another space is rejected. */
  readonly spaceId: string;
  readonly userId: string;
  readonly workspaceId: string;
}

export interface UpdatePagePropertiesInput {
  /** Operations in the wire shape that land in the same transaction as the values. */
  readonly extraOperations?: readonly PageBlockOperation[];
  /** Lists that change by what leaves and what enters, so two people never undo each other. */
  readonly listChanges?: PageValueListChanges;
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
  readonly content: JsonValue;
  readonly cover?: PageCoverValue | null;
  readonly createdAt: Date;
  readonly createdBy: null | { readonly id: string; readonly name: string };
  /** True when the page declares its own permissions instead of following an ancestor or the space. */
  readonly hasOwnPermissions: boolean;
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
  readonly size: number;
  readonly storageKey: string;
}

export interface PageAttachmentsCleanupRepositoryContract {
  readonly deleteForPages: (pageIds: readonly string[]) => Promise<void>;
  readonly listAssetsForPages: (pageIds: readonly string[]) => Promise<readonly PageAssetForExport[]>;
  readonly listStorageKeysForPages: (pageIds: readonly string[]) => Promise<readonly string[]>;
}

export interface PagePurgeRequest {
  readonly pageIds: readonly string[];
  readonly purgeAfter: Date;
  readonly requestedById: string;
  readonly workspaceId: string;
}

export interface PagePurgeRepositoryContract {
  readonly purgeDue: (now: Date, limit: number) => Promise<readonly string[]>;
}

export interface PageVersionRetentionRepositoryContract {
  readonly thin: (olderThan: Date) => Promise<number>;
}

export interface PagePurgeSchedule {
  readonly purgeAfter: Date;
  readonly scheduledCount: number;
}

export interface TrashedPageSummary {
  readonly deletedAt: Date;
  /** Null until someone deletes it forever; then the moment it goes. */
  readonly purgeAfter: Date | null;
  readonly deletedBy: null | { readonly id: string; readonly name: string };
  readonly id: string;
  /** A template of its collection (its parent), not a row of it: restoring puts it back among the templates. */
  readonly isTemplate: boolean;
  readonly parentId: null | string;
  readonly spaceId: string;
  readonly title: string;
  readonly trashedChildCount: number;
}

/** What a version keeps of a page: its title and its content as a document. */
export interface PageVersionSnapshot {
  readonly content: PageContent;
  readonly title: string;
  readonly version: number;
}

/** One entry of a page's history: who started the stretch and when, never the content. */
export interface PageVersionSummary {
  readonly author: null | { readonly id: string; readonly name: string };
  readonly createdAt: Date;
  readonly title: string;
  readonly version: number;
}

/** `fold: false` cuts a version of its own even when the author is still in the stretch of the latest one. */
export interface PageVersionRecordOptions {
  readonly fold: boolean;
}

/** Newest first; `nextCursor` is the version to pass to get the entries after the last one, or null at the end. */
export interface PageVersionListing {
  readonly items: readonly PageVersionSummary[];
  readonly nextCursor: null | number;
}

export type PageRestoreVersionOutcome =
  | (typeof PAGE_RESTORE_VERSION_OUTCOME)['missing']
  | null
  | { readonly page: PageSummary };

export interface PageRepositoryContract {
  readonly countDescendantsByLifecycle: (
    pageId: string,
    lifecycle: PageLifecycle,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<null | number>;
  readonly create: (input: NewPageInput) => Promise<PageSummary | null>;
  /** What a new row of the collection copies: the template named, the default one when undefined, none when null. */
  readonly readRowTemplate: (
    collectionId: string,
    templateId: null | string | undefined,
    viewer: PageViewer,
  ) => Promise<PageRowTemplate | 'NOT_FOUND' | null>;
  readonly duplicate: (input: DuplicatePageInput) => Promise<PageSummary | null>;
  readonly deleteForever: (
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
    purgeAfter: Date,
  ) => Promise<PageDeleteForeverOutcome>;
  readonly emptyTrash: (
    workspaceId: string,
    userId: string,
    role: UserRole,
    spaceId: null | string,
    purgeAfter: Date,
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
  /** Only the named pages of the space that the reader may open and that are not in the trash, in sibling order. */
  readonly listAccessibleAmong: (
    spaceId: string,
    pageIds: readonly string[],
    workspaceId: string,
    userId: string,
    role: UserRole,
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
  /** Null when the page does not exist or the writer cannot change it. */
  readonly writeContent: (writer: PageContentWriter, rewrite: PageContentRewrite) => Promise<PageContent | null>;
  /** Null when the page or the version is not there for this reader; blocks closed to them are cut from it. */
  readonly findVersion: (
    pageId: string,
    version: number,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<PageVersionSnapshot | null>;
  /** Null when the page is not there for this reader. `cursor` is exclusive: only versions below it are listed. */
  readonly listVersions: (
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
    cursor: null | number,
    limit: number,
  ) => Promise<null | PageVersionListing>;
  /** Cuts a version when the page now says something other than its latest one, or folds into it (same stretch). */
  readonly recordVersion: (pageId: string, authorId: string) => Promise<void>;
  readonly restoreVersion: (
    pageId: string,
    version: number,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ) => Promise<PageRestoreVersionOutcome>;
  /** Merges only the named values into those the page has when the write lands; null if it cannot be changed. */
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
  readonly setDefaultTemplate: (
    collectionId: string,
    templateId: null | string,
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
