import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DatabasePropertyType, type JsonValue, PageLifecycle } from '@neuma/db';
import {
  givePageBlocksTheirIds,
  isValidPageTimeZone,
  type PageContent,
  Result,
  USER_ROLE,
  type UserRole,
  writePagesAsMarkdownFiles,
} from '@neuma/shared';
import { Logger } from 'nestjs-pino';
import { STORAGE_PROVIDER } from '../../common/constants/storage.constants';
import type { SchemaPropertyDefinition, SchemaPropertyValues } from '../../common/domain/schema.domain.types';
import { withoutServerValues } from '../../common/domain/schema-property.domain';
import type { IStorageProvider } from '../../common/types/storage.types';
import { mapWithBoundedConcurrency } from '../../common/utils/concurrency.utils';
import {
  EXPORT_ATTACHMENT_READS_AT_ONCE,
  EXPORT_ATTACHMENTS_FOLDER,
  EXPORT_MAX_ATTACHMENT_MEGABYTES,
  PAGE_ATTACHMENTS_CLEANUP_REPOSITORY,
  PAGE_PURGE_BATCH_SIZE,
  PAGE_PURGE_DELAY_DAYS,
  PAGE_PURGE_REPOSITORY,
  PAGE_QUERY_DEFAULT_TIME_ZONE,
  PAGE_REPOSITORY,
  PAGE_RESTORE_VERSION_OUTCOME,
  PAGE_SCHEMA_REPOSITORY,
  PAGE_VERSION_FULL_HISTORY_DAYS,
  PAGE_VERSION_RETENTION_REPOSITORY,
  REDACTED_MENTION_LABEL,
} from './constants/pages.constants';
import { hasValidPageParent, isPageAssignedTo, isPageMoveAllowed, validatePageContent } from './domain/page.domain';
import {
  PageAccessDeniedError,
  PageContentValidationError,
  PageCoverValidationError,
  PageCycleError,
  PageExportTooLargeError,
  PageIconValidationError,
  PageLifecycleError,
  PageLockedError,
  PageOwnerInvalidError,
  PageParentError,
  PagePropertyConformanceError,
  PagePropertyValidationError,
  PageTemplateNotFoundError,
  PageVersionNotFoundError,
} from './domain/page.error';
import { buildValueListOperation } from './domain/page.operation.domain';
import { canDeletePagesForever, computeDaysBefore, computePurgeAfter } from './domain/page.purge.domain';
import { validatePageCover } from './domain/page-cover.domain';
import {
  fitsInOneExport,
  keepReferencedAssets,
  readExportableContent,
  selectPagesForExport,
} from './domain/page-export.domain';
import type { PageExportScope } from './domain/page-export.domain.types';
import { validatePageIcon } from './domain/page-icon.domain';
import { extractMentionTargetPageIds, redactUnreadableMentions } from './domain/page-mention.domain';
import {
  checkValuesAreWritableHere,
  keepWhatThePageSchemaKnows,
  listFileIds,
  mergePagePropertyValues,
  validatePageProperties,
} from './domain/page-schema.domain';
import { applyRowTemplate } from './domain/page-template.domain';
import { applyValueListChanges } from './domain/page-value-list.domain';
import type {
  CarriedAttachment,
  CreatePageInput,
  ExportedFile,
  PageAssetForExport,
  PageAttachmentsCleanupRepositoryContract,
  PageContentRewrite,
  PageContentWriter,
  PageDescendantsPreview,
  PageLogger,
  PageMoveRequest,
  PagePurgeRepositoryContract,
  PagePurgeSchedule,
  PageRepositoryContract,
  PageRestoreOutcome,
  PageSummary,
  PageVersionListing,
  PageVersionRetentionRepositoryContract,
  PageVersionSnapshot,
  TrashedPageListing,
  UpdatePagePropertiesInput,
} from './types/page.types';
import type { PageOutlineWindow } from './types/page-outline.types';
import type { PageSchemaRepositoryContract } from './types/page-schema.types';
import type { PageRowStart, PageRowStartFailure } from './types/page-template.types';

@Injectable()
export class PagesService {
  constructor(
    @Inject(PAGE_REPOSITORY) private readonly pageRepository: PageRepositoryContract,
    @Inject(PAGE_SCHEMA_REPOSITORY) private readonly pageSchemaRepository: PageSchemaRepositoryContract,
    @Inject(PAGE_ATTACHMENTS_CLEANUP_REPOSITORY)
    private readonly pageAttachmentsCleanupRepository: PageAttachmentsCleanupRepositoryContract,
    @Inject(STORAGE_PROVIDER) private readonly storageProvider: IStorageProvider,
    @Inject(Logger) private readonly logger: PageLogger,
    @Inject(PAGE_PURGE_REPOSITORY) private readonly pagePurgeRepository: PagePurgeRepositoryContract,
    @Inject(PAGE_VERSION_RETENTION_REPOSITORY)
    private readonly pageVersionRetentionRepository: PageVersionRetentionRepositoryContract,
  ) {}

  async list(
    spaceId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
    includeTrashed = false,
  ): Promise<readonly PageSummary[]> {
    const pages = await this.pageRepository.listAccessible(spaceId, workspaceId, userId, role, includeTrashed);
    return this.redactPages(pages, workspaceId, userId, role);
  }

  /** Goes through the normal listing, so no page the asker cannot open is exported; trashed pages are excluded. */
  async exportAsMarkdown(
    spaceId: string,
    scope: PageExportScope,
    workspaceId: string,
    userId: string,
    role: UserRole,
    untitledLabel: string,
  ): Promise<Result<readonly ExportedFile[], PageAccessDeniedError | PageExportTooLargeError>> {
    const pages = await this.list(spaceId, workspaceId, userId, role, false);
    const chosen = selectPagesForExport(pages, scope);
    if (chosen.length === 0) return Result.fail(new PageAccessDeniedError());

    const documents = chosen.map((page) => ({
      content: readExportableContent(page.content),
      id: page.id,
      path: page.path,
      title: page.title,
    }));
    const owned = await this.pageAttachmentsCleanupRepository.listAssetsForPages(chosen.map((page) => page.id));
    const assets = keepReferencedAssets(
      owned,
      documents.map((document) => document.content),
    );
    if (!fitsInOneExport(assets, EXPORT_MAX_ATTACHMENT_MEGABYTES)) {
      return Result.fail(new PageExportTooLargeError(EXPORT_MAX_ATTACHMENT_MEGABYTES));
    }
    const carried = await this.gatherAttachments(assets);
    const written = writePagesAsMarkdownFiles(
      documents,
      untitledLabel,
      new Map(carried.map((asset) => [asset.id, asset.path])),
    );

    return Result.ok([...written, ...carried.map(({ contents, path }) => ({ contents, path }))]);
  }

  /** Own folder, since one file can appear on several pages. An unreadable file is skipped. */
  private async gatherAttachments(assets: readonly PageAssetForExport[]): Promise<readonly CarriedAttachment[]> {
    // Bounded so a space with hundreds of files does not open hundreds of reads at once.
    const carried = await mapWithBoundedConcurrency(assets, EXPORT_ATTACHMENT_READS_AT_ONCE, async (asset) => {
      try {
        const contents = await this.storageProvider.read(asset.storageKey);
        return { contents, id: asset.id, path: `${EXPORT_ATTACHMENTS_FOLDER}/${asset.id}-${asset.originalFilename}` };
      } catch (error) {
        this.logger.warn({ assetId: asset.id, err: error, message: 'An attachment could not be carried' });
        return null;
      }
    });
    return carried.filter((asset): asset is CarriedAttachment => asset !== null);
  }

  async getAccessible(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<PageSummary, PageAccessDeniedError>> {
    const page = await this.pageRepository.getAccessible(pageId, workspaceId, userId, role);
    return this.toAccessiblePageResult(page, workspaceId, userId, role);
  }

  async create(
    input: CreatePageInput,
    role: UserRole,
  ): Promise<
    Result<
      PageSummary,
      | PageAccessDeniedError
      | PageContentValidationError
      | PagePropertyValidationError
      | PageParentError
      | PageTemplateNotFoundError
    >
  > {
    const content = this.validateWritableContent(role, input.content);
    if (content.isFail()) return Result.fail(content.getError());
    if (input.parentId !== null && !(await this.pageRepository.parentBelongsToSpace(input.parentId, input.spaceId))) {
      return Result.fail(new PageParentError());
    }
    const start = await this.startFromTemplate(input, content.getValue());
    if (start.isFail()) return Result.fail(start.getError());
    const { title } = start.getValue();
    const startValues = start.getValue().propertyValues;
    const propertyValues = await this.resolvePropertyValuesForWrite(
      input.parentId,
      input.workspaceId,
      title,
      startValues,
      { pageId: null, userId: input.userId },
    );
    if (propertyValues.isFail()) return Result.fail(propertyValues.getError());
    const page = await this.pageRepository.create({
      ...input,
      content: givePageBlocksTheirIds(start.getValue().content, randomUUID),
      propertyValues: propertyValues.getValue(),
      title,
    });
    if (page === null) return Result.fail(new PageAccessDeniedError());
    await this.pageSchemaRepository.attachFilesToPage(
      page.id,
      listFileIds(await this.pageSchemaRepository.resolveSchemaProperties(input.parentId), startValues ?? {}),
    );
    return Result.ok(page);
  }

  /** Applies the rewrite to the document the page has now; the page keeps every block the rewrite leaves alone. */
  async writeContent(
    writer: PageContentWriter,
    rewrite: PageContentRewrite,
  ): Promise<Result<PageContent, PageAccessDeniedError>> {
    const content = await this.pageRepository.writeContent(writer, rewrite);
    return content === null ? Result.fail(new PageAccessDeniedError()) : Result.ok(content);
  }

  /** For whoever closes a stretch of editing the blocks module does not see: one history entry per stretch. */
  recordVersion(pageId: string, authorId: string): Promise<void> {
    return this.pageRepository.recordVersion(pageId, authorId);
  }

  /** History is an editing tool: a reader who may only read has no use for what the page said before. */
  async listVersions(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
    cursor: null | number,
    limit: number,
  ): Promise<Result<PageVersionListing, PageAccessDeniedError>> {
    if (role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const listing = await this.pageRepository.listVersions(pageId, workspaceId, userId, role, cursor, limit);
    return listing === null ? Result.fail(new PageAccessDeniedError()) : Result.ok(listing);
  }

  /** The version as a document, with the blocks closed to this reader already left out. */
  async readVersion(
    pageId: string,
    version: number,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<PageVersionSnapshot, PageAccessDeniedError | PageVersionNotFoundError>> {
    if (role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const page = await this.pageRepository.getAccessible(pageId, workspaceId, userId, role);
    if (page === null) return Result.fail(new PageAccessDeniedError());
    const snapshot = await this.pageRepository.findVersion(pageId, version, workspaceId, userId, role);
    return snapshot === null ? Result.fail(new PageVersionNotFoundError()) : Result.ok(snapshot);
  }

  /** Puts the page back as one of its versions said: its content and its title. */
  async restoreVersion(
    pageId: string,
    version: number,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<
    Result<PageSummary, PageAccessDeniedError | PageLifecycleError | PageLockedError | PageVersionNotFoundError>
  > {
    if (role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const existing = await this.pageRepository.getAccessible(pageId, workspaceId, userId, role);
    if (existing === null) return Result.fail(new PageAccessDeniedError());
    if (existing.lifecycle !== PageLifecycle.ACTIVE) return Result.fail(new PageLifecycleError());
    if (existing.lockedAt !== null) return Result.fail(new PageLockedError());
    const restored = await this.pageRepository.restoreVersion(pageId, version, userId, workspaceId, role);
    if (restored === PAGE_RESTORE_VERSION_OUTCOME.missing) return Result.fail(new PageVersionNotFoundError());
    return restored === null ? Result.fail(new PageAccessDeniedError()) : Result.ok(restored.page);
  }

  async authorizeContentWrite(
    writer: PageContentWriter,
    content: unknown,
  ): Promise<
    Result<PageContent, PageAccessDeniedError | PageContentValidationError | PageLifecycleError | PageLockedError>
  > {
    const allowed = await this.authorizeWrite(writer);
    return allowed.isFail() ? Result.fail(allowed.getError()) : validatePageContent(content);
  }

  async authorizeWrite(
    writer: PageContentWriter,
  ): Promise<Result<PageContentWriter, PageAccessDeniedError | PageLifecycleError | PageLockedError>> {
    if (writer.role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const page = await this.pageRepository.getAccessible(writer.pageId, writer.workspaceId, writer.userId, writer.role);
    if (page?.spaceId !== writer.spaceId) return Result.fail(new PageAccessDeniedError());
    if (page.lifecycle !== PageLifecycle.ACTIVE) return Result.fail(new PageLifecycleError());
    if (page.lockedAt !== null) return Result.fail(new PageLockedError());
    return Result.ok(writer);
  }

  /** Merges only the named properties over the stored ones, so a card drag never resends a stale copy of the row. */
  async updateProperties(
    input: UpdatePagePropertiesInput,
  ): Promise<Result<PageSummary, PageAccessDeniedError | PageLockedError | PagePropertyValidationError>> {
    if (input.role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const existing = await this.pageRepository.getAccessible(input.pageId, input.workspaceId, input.userId, input.role);
    if (existing === null) return Result.fail(new PageAccessDeniedError());
    if (existing.lockedAt !== null) return Result.fail(new PageLockedError());

    const schemaProperties = await this.pageSchemaRepository.resolveSchemaProperties(existing.parentId);
    const listChanges = input.listChanges ?? {};
    const extraOperations = [
      ...(input.extraOperations ?? []),
      ...Object.entries(listChanges).map(([property, change]) =>
        buildValueListOperation(input.pageId, property, change),
      ),
    ];
    const writable = checkValuesAreWritableHere(schemaProperties, input.propertyValues);
    if (writable.isFail()) return Result.fail(writable.getError());
    const files = await this.checkFilesCanBeAttached(schemaProperties, input.propertyValues, {
      pageId: input.pageId,
      userId: input.updatedById,
      workspaceId: input.workspaceId,
    });
    if (files.isFail()) return Result.fail(files.getError());
    const personIds = await this.resolvePersonIdsIfNeeded(schemaProperties, input.workspaceId);
    const title = input.title ?? existing.title;
    const page = await this.pageRepository.updatePropertyValues(
      {
        ...(extraOperations.length === 0 ? {} : { extraOperations }),
        ...(input.expectedVersion === undefined ? {} : { expectedVersion: input.expectedVersion }),
        pageId: input.pageId,
        role: input.role,
        ...(input.title === undefined ? {} : { title: input.title }),
        updatedById: input.updatedById,
        workspaceId: input.workspaceId,
      },
      (current) => {
        const outcome = validatePageProperties(
          schemaProperties,
          title,
          keepWhatThePageSchemaKnows(schemaProperties, mergePagePropertyValues(current, input.propertyValues)),
          { personIds, written: Object.keys(input.propertyValues) },
        );
        if (outcome.isFail() || Object.keys(listChanges).length === 0) return outcome;
        const afterLists = validatePageProperties(
          schemaProperties,
          title,
          keepWhatThePageSchemaKnows(
            schemaProperties,
            mergePagePropertyValues(applyValueListChanges(current, listChanges), input.propertyValues),
          ),
          { personIds, written: [...Object.keys(input.propertyValues), ...Object.keys(listChanges)] },
        );
        return afterLists.isFail() ? afterLists : outcome;
      },
    );
    if (page === null) return Result.fail(new PageAccessDeniedError());
    if (page.isOk()) {
      await this.pageSchemaRepository.attachFilesToPage(
        input.pageId,
        listFileIds(schemaProperties, input.propertyValues),
      );
    }
    return page;
  }

  /** Cuts no version: renaming does not change content. */
  async rename(
    pageId: string,
    title: string,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<Result<PageSummary, PageAccessDeniedError | PageLockedError>> {
    if (role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const existing = await this.pageRepository.getAccessible(pageId, workspaceId, userId, role);
    if (existing === null) return Result.fail(new PageAccessDeniedError());
    if (existing.lockedAt !== null) return Result.fail(new PageLockedError());
    const page = await this.pageRepository.rename(pageId, title, userId, workspaceId, role);
    return page === null ? Result.fail(new PageAccessDeniedError()) : Result.ok(page);
  }

  async updateIcon(
    pageId: string,
    icon: unknown,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<Result<PageSummary, PageAccessDeniedError | PageIconValidationError>> {
    if (role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const validatedIcon = validatePageIcon(icon);
    if (validatedIcon.isFail()) return Result.fail(validatedIcon.getError());
    const page = await this.pageRepository.updateIcon(pageId, validatedIcon.getValue(), userId, workspaceId, role);
    return page === null ? Result.fail(new PageAccessDeniedError()) : Result.ok(page);
  }

  async duplicate(
    pageId: string,
    includeChildren: boolean,
    title: null | string,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<Result<PageSummary, PageAccessDeniedError>> {
    if (role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const copy = await this.pageRepository.duplicate({ includeChildren, pageId, role, title, userId, workspaceId });
    return copy === null ? Result.fail(new PageAccessDeniedError()) : Result.ok(copy);
  }

  async setLocked(
    pageId: string,
    locked: boolean,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<Result<PageSummary, PageAccessDeniedError>> {
    if (role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const page = await this.pageRepository.setLocked(pageId, locked, userId, workspaceId, role);
    return page === null ? Result.fail(new PageAccessDeniedError()) : Result.ok(page);
  }

  /** Verifying again re-stamps who and when, which is how an expiration is extended. */
  async setVerification(
    pageId: string,
    verified: boolean,
    expiresAt: null | string | undefined,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<Result<PageSummary, PageAccessDeniedError>> {
    if (role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const resolvedExpiresAt = verified && expiresAt !== undefined && expiresAt !== null ? new Date(expiresAt) : null;
    const page = await this.pageRepository.setVerification(
      pageId,
      verified,
      resolvedExpiresAt,
      userId,
      workspaceId,
      role,
    );
    return page === null ? Result.fail(new PageAccessDeniedError()) : Result.ok(page);
  }

  /** The owner must be a workspace member. */
  async setOwner(
    pageId: string,
    ownerId: null | string,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<Result<PageSummary, PageAccessDeniedError | PageOwnerInvalidError>> {
    if (role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    if (ownerId !== null) {
      const memberIds = await this.pageSchemaRepository.listWorkspaceMemberIds(workspaceId);
      if (!memberIds.includes(ownerId)) return Result.fail(new PageOwnerInvalidError());
    }
    const page = await this.pageRepository.setOwner(pageId, ownerId, userId, workspaceId, role);
    return page === null ? Result.fail(new PageAccessDeniedError()) : Result.ok(page);
  }

  async updateCover(
    pageId: string,
    cover: unknown,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<Result<PageSummary, PageAccessDeniedError | PageCoverValidationError>> {
    if (role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const validatedCover = validatePageCover(cover);
    if (validatedCover.isFail()) return Result.fail(validatedCover.getError());
    const page = await this.pageRepository.updateCover(pageId, validatedCover.getValue(), userId, workspaceId, role);
    return page === null ? Result.fail(new PageAccessDeniedError()) : Result.ok(page);
  }

  /** Person properties are resolved once per collection, not per page, since a collection shares one schema. */
  async listAssignedTo(userId: string, workspaceId: string, role: UserRole): Promise<readonly PageSummary[]> {
    const pages = await this.pageRepository.listWithProperties(workspaceId, userId, role);
    const collectionIds = [...new Set(pages.flatMap((page) => (page.parentId === null ? [] : [page.parentId])))];
    const personKeysByCollection = await this.pageSchemaRepository.listPersonPropertyKeys(collectionIds);
    return pages.filter((page) => {
      const personKeys = page.parentId === null ? [] : (personKeysByCollection.get(page.parentId) ?? []);
      return isPageAssignedTo(page.propertyValues, personKeys, userId);
    });
  }

  async reorderAmongSiblings(
    pageId: string,
    beforePageId: null | string,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<Result<readonly PageSummary[], PageAccessDeniedError>> {
    if (role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const pages = await this.pageRepository.reorderAmongSiblings(pageId, beforePageId, userId, workspaceId, role);
    return pages === null ? Result.fail(new PageAccessDeniedError()) : Result.ok(pages);
  }

  async move(
    request: PageMoveRequest,
  ): Promise<
    Result<PageSummary, PageAccessDeniedError | PageCycleError | PageParentError | PagePropertyConformanceError>
  > {
    const { pageId, parentId, role, targetSpaceId, userId, workspaceId } = request;
    if (role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const context = await this.pageRepository.findMoveContext(pageId, targetSpaceId, workspaceId, userId, role);
    if (context === null) return Result.fail(new PageAccessDeniedError());
    const destinationSpaceId = targetSpaceId ?? context.spaceId;
    const allowed = this.validateMove(pageId, parentId, destinationSpaceId, context.pages);
    if (allowed.isFail()) return Result.fail(allowed.getError());
    const conformance = await this.resolvePropertyValuesForWrite(
      parentId,
      workspaceId,
      context.title,
      context.propertyValues,
    );
    if (conformance.isFail()) return Result.fail(new PagePropertyConformanceError(conformance.getError().details));
    const page = await this.pageRepository.move({ ...request, targetSpaceId: destinationSpaceId });
    return this.toAccessiblePageResult(page, workspaceId, userId, role);
  }

  async trash(
    pageId: string,
    userId: string,
    workspaceId: string,
    mutationId: string,
    role: UserRole,
  ): Promise<Result<boolean, PageAccessDeniedError | PageLifecycleError>> {
    if (role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const trashed = await this.pageRepository.trashCascade(pageId, userId, workspaceId, role, mutationId);
    return trashed ? Result.ok(true) : Result.fail(new PageLifecycleError());
  }

  async restore(
    pageId: string,
    userId: string,
    workspaceId: string,
    mutationId: string,
    role: UserRole,
    includeChildren = false,
  ): Promise<Result<PageRestoreOutcome, PageAccessDeniedError | PageLifecycleError>> {
    if (role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const outcome = await this.pageRepository.restoreCascade(
      pageId,
      userId,
      workspaceId,
      role,
      mutationId,
      includeChildren,
    );
    return outcome === null ? Result.fail(new PageLifecycleError()) : Result.ok(outcome);
  }

  async previewTrashCascade(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<PageDescendantsPreview, PageAccessDeniedError>> {
    return this.previewDescendants(pageId, PageLifecycle.ACTIVE, workspaceId, userId, role);
  }

  async previewRestoreCascade(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<PageDescendantsPreview, PageAccessDeniedError>> {
    return this.previewDescendants(pageId, PageLifecycle.TRASHED, workspaceId, userId, role);
  }

  async listTrashed(
    workspaceId: string,
    userId: string,
    role: UserRole,
    spaceId: null | string,
    search: null | string,
    window: PageOutlineWindow | null,
  ): Promise<TrashedPageListing> {
    return this.pageRepository.listTrashed(workspaceId, userId, role, spaceId, search, window);
  }

  /** Schedules the deletion; the page and its attachments stay until the delay passes (ADR 017). */
  async deleteForever(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<PagePurgeSchedule, PageAccessDeniedError | PageLifecycleError>> {
    if (!canDeletePagesForever(role)) return Result.fail(new PageAccessDeniedError());
    const purgeAfter = computePurgeAfter(new Date(), PAGE_PURGE_DELAY_DAYS);
    const outcome = await this.pageRepository.deleteForever(pageId, workspaceId, userId, role, purgeAfter);
    if (outcome === 'NOT_FOUND') return Result.fail(new PageAccessDeniedError());
    if (outcome === 'NOT_TRASHED') return Result.fail(new PageLifecycleError());
    return Result.ok({ purgeAfter, scheduledCount: 1 });
  }

  async emptyTrash(
    workspaceId: string,
    userId: string,
    role: UserRole,
    spaceId: null | string,
  ): Promise<Result<PagePurgeSchedule, PageAccessDeniedError>> {
    if (!canDeletePagesForever(role)) return Result.fail(new PageAccessDeniedError());
    const purgeAfter = computePurgeAfter(new Date(), PAGE_PURGE_DELAY_DAYS);
    const scheduled = await this.pageRepository.emptyTrash(workspaceId, userId, role, spaceId, purgeAfter);
    return Result.ok({ purgeAfter, scheduledCount: scheduled.length });
  }

  /** Deletes what is past its deadline, in batches, and only then removes the attachments' files. */
  async purgeDuePages(now: Date): Promise<number> {
    let purgedCount = 0;
    let batch: readonly string[];
    do {
      batch = await this.pagePurgeRepository.purgeDue(now, PAGE_PURGE_BATCH_SIZE);
      await this.cleanupAttachments(batch);
      purgedCount += batch.length;
    } while (batch.length >= PAGE_PURGE_BATCH_SIZE);
    return purgedCount;
  }

  /** The last month keeps every version; older history keeps one per page and day. */
  thinOldVersions(now: Date): Promise<number> {
    return this.pageVersionRetentionRepository.thin(computeDaysBefore(now, PAGE_VERSION_FULL_HISTORY_DAYS));
  }

  validateMove(
    pageId: string,
    parentId: null | string,
    targetSpaceId: string,
    pages: readonly { id: string; parentId: null | string; spaceId: string }[],
  ): Result<true, PageCycleError | PageParentError> {
    if (!hasValidPageParent(pageId, parentId, targetSpaceId, pages)) return Result.fail(new PageParentError());
    return isPageMoveAllowed(pageId, parentId, targetSpaceId, pages)
      ? Result.ok(true)
      : Result.fail(new PageCycleError());
  }

  /** A row of a collection starts from its template: the one named, or the default one when none is named. */
  private async startFromTemplate(
    input: CreatePageInput,
    content: PageContent,
  ): Promise<Result<PageRowStart, PageRowStartFailure>> {
    const start: PageRowStart = { content, propertyValues: input.propertyValues, title: input.title };
    if (input.parentId === null) return Result.ok(start);
    const started = await this.copyTemplate(input, input.parentId, start);
    if (started.isFail() || input.defaultValues === undefined) return started;
    const given = started.getValue();
    return Result.ok({ ...given, propertyValues: { ...input.defaultValues, ...given.propertyValues } });
  }

  private async copyTemplate(
    input: CreatePageInput,
    collectionId: string,
    start: PageRowStart,
  ): Promise<Result<PageRowStart, PageRowStartFailure>> {
    if (input.templateId === null) return Result.ok(start);
    const timeZone = input.timeZone ?? PAGE_QUERY_DEFAULT_TIME_ZONE;
    if (!isValidPageTimeZone(timeZone)) {
      return Result.fail(new PagePropertyValidationError(`${timeZone} is not a time zone`));
    }
    const actor = { role: input.role, userId: input.userId, workspaceId: input.workspaceId };
    const template = await this.pageRepository.readRowTemplate(collectionId, input.templateId, actor);
    if (template === null) return Result.ok(start);
    if (template === 'NOT_FOUND') return Result.fail(new PageTemplateNotFoundError());
    const columns = await this.pageSchemaRepository.resolveSchemaProperties(collectionId);
    return applyRowTemplate(start, template, columns, { now: Date.now(), timeZone, viewerId: input.userId });
  }

  private validateWritableContent(
    role: UserRole,
    content: JsonValue | PageContent,
  ): Result<PageContent, PageAccessDeniedError | PageContentValidationError> {
    if (role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    return validatePageContent(content);
  }

  private async toAccessiblePageResult(
    page: PageSummary | null,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<PageSummary, PageAccessDeniedError>> {
    if (page === null) return Result.fail(new PageAccessDeniedError());
    const redactedPages = await this.redactPages([page], workspaceId, userId, role);
    return Result.ok(redactedPages.at(0) ?? page);
  }

  private async previewDescendants(
    pageId: string,
    lifecycle: PageLifecycle,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<PageDescendantsPreview, PageAccessDeniedError>> {
    const childPageCount = await this.pageRepository.countDescendantsByLifecycle(
      pageId,
      lifecycle,
      workspaceId,
      userId,
      role,
    );
    return childPageCount === null ? Result.fail(new PageAccessDeniedError()) : Result.ok({ childPageCount });
  }

  /** Logged, not thrown: the page row is already gone, but an orphaned file must leave a trace. */
  private async cleanupAttachments(pageIds: readonly string[]): Promise<void> {
    if (pageIds.length === 0) return;
    const storageKeys = await this.pageAttachmentsCleanupRepository.listStorageKeysForPages(pageIds);
    await this.pageAttachmentsCleanupRepository.deleteForPages(pageIds);
    const removals = await Promise.allSettled(storageKeys.map((storageKey) => this.storageProvider.delete(storageKey)));
    for (const [index, removal] of removals.entries()) {
      if (removal.status === 'rejected') {
        this.logger.warn({
          err: removal.reason,
          message: 'An attachment outlived its page and is still in storage',
          storageKey: storageKeys[index],
        });
      }
    }
  }

  /** A row is created or moved into a collection: every required property is asked for; relations are not written. */
  private async resolvePropertyValuesForWrite(
    parentId: null | string,
    workspaceId: string,
    title: string,
    propertyValues: Readonly<Record<string, unknown>> | null,
    attaching: { readonly pageId: null | string; readonly userId: string } | null = null,
  ): Promise<Result<SchemaPropertyValues | null, PagePropertyValidationError>> {
    const schemaProperties = await this.pageSchemaRepository.resolveSchemaProperties(parentId);
    if (attaching !== null) {
      const writable = checkValuesAreWritableHere(schemaProperties, propertyValues ?? {});
      if (writable.isFail()) return Result.fail(writable.getError());
      const files = await this.checkFilesCanBeAttached(schemaProperties, propertyValues ?? {}, {
        ...attaching,
        workspaceId,
      });
      if (files.isFail()) return Result.fail(files.getError());
    }
    const personIds = await this.resolvePersonIdsIfNeeded(schemaProperties, workspaceId);
    const values = attaching === null ? withoutServerValues(schemaProperties, propertyValues) : propertyValues;
    return validatePageProperties(schemaProperties, title, values, { personIds });
  }

  /** The files named must exist, be active and be the writer's or the row's already: an id alone grants nothing. */
  private async checkFilesCanBeAttached(
    schemaProperties: readonly SchemaPropertyDefinition[],
    propertyValues: Readonly<Record<string, unknown>>,
    scope: { readonly pageId: null | string; readonly userId: string; readonly workspaceId: string },
  ): Promise<Result<void, PagePropertyValidationError>> {
    const wanted = listFileIds(schemaProperties, propertyValues);
    const usable = await this.pageSchemaRepository.findAttachableFileIds(wanted, scope);
    const refused = wanted.find((fileId) => !usable.has(fileId));
    return refused === undefined
      ? Result.ok(undefined)
      : Result.fail(new PagePropertyValidationError(`The file ${refused} cannot be attached`));
  }

  private async resolvePersonIdsIfNeeded(
    schemaProperties: readonly SchemaPropertyDefinition[],
    workspaceId: string,
  ): Promise<ReadonlySet<string> | undefined> {
    const needsPersonIds = schemaProperties.some((property) => property.type === DatabasePropertyType.PERSON);
    if (!needsPersonIds) return;
    return new Set(await this.pageSchemaRepository.listWorkspaceMemberIds(workspaceId));
  }

  private async redactPages(
    pages: readonly PageSummary[],
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<readonly PageSummary[]> {
    const pagesWithMentionIds = pages.map((page) => ({ mentionIds: extractMentionTargetPageIds(page.content), page }));
    const referencedPageIds = [...new Set(pagesWithMentionIds.flatMap((entry) => entry.mentionIds))];
    if (referencedPageIds.length === 0) return pages;
    const readablePageIds = new Set(
      await this.pageRepository.findReadablePageIds(referencedPageIds, workspaceId, userId, role),
    );
    return pagesWithMentionIds.map((entry) =>
      entry.mentionIds.length === 0
        ? entry.page
        : {
            ...entry.page,
            content: redactUnreadableMentions(entry.page.content, readablePageIds, REDACTED_MENTION_LABEL),
          },
    );
  }
}
