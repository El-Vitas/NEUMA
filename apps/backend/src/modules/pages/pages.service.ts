import { DatabasePropertyType, PageLifecycle } from '@company-brain/db';
import type { Prisma } from '@company-brain/db/generated';
import { type PageContent, Result, USER_ROLE, type UserRole, writePagesAsMarkdownFiles } from '@company-brain/shared';
import { Inject, Injectable } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { STORAGE_PROVIDER } from '../../common/constants/storage.constants';
import type { SchemaPropertyDefinition, SchemaPropertyValues } from '../../common/domain/schema.domain.types';
import type { IStorageProvider } from '../../common/types/storage.types';
import {
  EXPORT_ATTACHMENTS_FOLDER,
  PAGE_ATTACHMENTS_CLEANUP_REPOSITORY,
  PAGE_REPOSITORY,
  PAGE_SCHEMA_REPOSITORY,
  REDACTED_MENTION_LABEL,
} from './constants/pages.constants';
import { hasValidPageParent, isPageAssignedTo, isPageMoveAllowed, validatePageContent } from './domain/page.domain';
import {
  PageAccessDeniedError,
  PageContentValidationError,
  PageCoverValidationError,
  PageCycleError,
  PageIconValidationError,
  PageLifecycleError,
  PageLockedError,
  PageOwnerInvalidError,
  PageParentError,
  PagePropertyConformanceError,
  PagePropertyValidationError,
} from './domain/page.error';
import { validatePageCover } from './domain/page-cover.domain';
import { readExportableContent, selectPagesForExport } from './domain/page-export.domain';
import type { PageExportScope } from './domain/page-export.domain.types';
import { validatePageIcon } from './domain/page-icon.domain';
import { extractMentionTargetPageIds, redactUnreadableMentions } from './domain/page-mention.domain';
import {
  keepWhatThePageSchemaKnows,
  mergePagePropertyValues,
  validatePageProperties,
} from './domain/page-schema.domain';
import type {
  CarriedAttachment,
  CreatePageInput,
  ExportedFile,
  PageAttachmentsCleanupRepositoryContract,
  PageDescendantsPreview,
  PageLogger,
  PageMoveDestinations,
  PageRepositoryContract,
  PageRestoreOutcome,
  PageSummary,
  TrashedPageSummary,
  UpdatePageInput,
  UpdatePagePropertiesInput,
} from './types/page.types';
import type { PageSchemaRepositoryContract } from './types/page-schema.types';

@Injectable()
export class PagesService {
  constructor(
    @Inject(PAGE_REPOSITORY) private readonly pageRepository: PageRepositoryContract,
    @Inject(PAGE_SCHEMA_REPOSITORY) private readonly pageSchemaRepository: PageSchemaRepositoryContract,
    @Inject(PAGE_ATTACHMENTS_CLEANUP_REPOSITORY)
    private readonly pageAttachmentsCleanupRepository: PageAttachmentsCleanupRepositoryContract,
    @Inject(STORAGE_PROVIDER) private readonly storageProvider: IStorageProvider,
    @Inject(Logger) private readonly logger: PageLogger,
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

  /**
   * A scope of pages written out as one Markdown file.
   *
   * Read through the same door as any other listing, so an export never hands
   * over a page its asker could not have opened one at a time. Pages in the
   * trash stay out: what is exported is what the space holds, not what it once
   * held.
   */
  async exportAsMarkdown(
    spaceId: string,
    scope: PageExportScope,
    workspaceId: string,
    userId: string,
    role: UserRole,
    untitledLabel: string,
  ): Promise<Result<readonly ExportedFile[], PageAccessDeniedError>> {
    const pages = await this.list(spaceId, workspaceId, userId, role, false);
    const chosen = selectPagesForExport(pages, scope);
    if (chosen.length === 0) return Result.fail(new PageAccessDeniedError());

    const carried = await this.gatherAttachments(chosen.map((page) => page.id));
    const written = writePagesAsMarkdownFiles(
      chosen.map((page) => ({
        content: readExportableContent(page.content),
        id: page.id,
        path: page.path,
        title: page.title,
      })),
      untitledLabel,
      new Map(carried.map((asset) => [asset.id, asset.path])),
    );

    return Result.ok([...written, ...carried.map(({ contents, path }) => ({ contents, path }))]);
  }

  /**
   * What hangs on the exported pages, read out of storage so it can travel too.
   *
   * They go in a folder of their own rather than beside the pages that use
   * them, because one picture can be shown on several pages and there is only
   * one of it. A file that storage can no longer hand over is left behind
   * rather than taking the whole export down: the writing that mentions it
   * still says what it was.
   */
  private async gatherAttachments(pageIds: readonly string[]): Promise<readonly CarriedAttachment[]> {
    const assets = await this.pageAttachmentsCleanupRepository.listAssetsForPages(pageIds);
    const carried = await Promise.all(
      assets.map(async (asset) => {
        try {
          const contents = await this.storageProvider.read(asset.storageKey);
          return { contents, id: asset.id, path: `${EXPORT_ATTACHMENTS_FOLDER}/${asset.id}-${asset.originalFilename}` };
        } catch (error) {
          this.logger.warn({ assetId: asset.id, err: error, message: 'An attachment could not be carried' });
          return null;
        }
      }),
    );
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
      PageAccessDeniedError | PageContentValidationError | PagePropertyValidationError | PageParentError
    >
  > {
    const content = this.validateWritableContent(role, input.content);
    if (content.isFail()) return Result.fail(content.getError());
    if (input.parentId !== null && !(await this.pageRepository.parentBelongsToSpace(input.parentId, input.spaceId))) {
      return Result.fail(new PageParentError());
    }
    const propertyValues = await this.resolvePropertyValuesForWrite(
      input.parentId,
      input.workspaceId,
      input.title,
      input.propertyValues,
    );
    if (propertyValues.isFail()) return Result.fail(propertyValues.getError());
    const page = await this.pageRepository.create({
      ...input,
      content: content.getValue(),
      propertyValues: propertyValues.getValue(),
    });
    return page === null ? Result.fail(new PageAccessDeniedError()) : Result.ok(page);
  }

  async update(
    input: UpdatePageInput,
    role: UserRole,
  ): Promise<
    Result<
      PageSummary,
      PageAccessDeniedError | PageContentValidationError | PageLockedError | PagePropertyValidationError
    >
  > {
    const content = this.validateWritableContent(role, input.content);
    if (content.isFail()) return Result.fail(content.getError());
    const existingPage = await this.pageRepository.getAccessible(
      input.pageId,
      input.workspaceId,
      input.userId,
      input.role,
    );
    if (existingPage === null) return Result.fail(new PageAccessDeniedError());
    if (existingPage.lockedAt !== null) return Result.fail(new PageLockedError());
    const propertyValues = await this.resolvePropertyValuesForWrite(
      existingPage.parentId,
      input.workspaceId,
      input.title,
      input.propertyValues,
    );
    if (propertyValues.isFail()) return Result.fail(propertyValues.getError());
    const page = await this.pageRepository.update({
      ...input,
      content: content.getValue(),
      propertyValues: propertyValues.getValue(),
    });
    return page === null ? Result.fail(new PageAccessDeniedError()) : Result.ok(page);
  }

  /**
   * What a row holds changed, without the writing being touched.
   *
   * Only the properties named travel, and they land on top of the ones the row
   * already had. That is what lets a card be dragged from one column to another
   * without carrying the whole page along: whoever moves it knows the value that
   * changed and nothing else, and sending the rest would be sending back a copy
   * of what it read, stale by however long the drag took.
   */
  async updateProperties(
    input: UpdatePagePropertiesInput,
  ): Promise<Result<PageSummary, PageAccessDeniedError | PageLockedError | PagePropertyValidationError>> {
    if (input.role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const existing = await this.pageRepository.getAccessible(input.pageId, input.workspaceId, input.userId, input.role);
    if (existing === null) return Result.fail(new PageAccessDeniedError());
    if (existing.lockedAt !== null) return Result.fail(new PageLockedError());

    const schemaProperties = await this.pageSchemaRepository.resolveSchemaProperties(existing.parentId);
    const merged = keepWhatThePageSchemaKnows(
      schemaProperties,
      mergePagePropertyValues(existing.propertyValues, input.propertyValues),
    );
    const propertyValues = await this.resolvePropertyValuesForWrite(
      existing.parentId,
      input.workspaceId,
      existing.title,
      merged,
    );
    if (propertyValues.isFail()) return Result.fail(propertyValues.getError());

    const page = await this.pageRepository.update({
      content: existing.content as Prisma.InputJsonValue,
      pageId: input.pageId,
      propertyValues: propertyValues.getValue(),
      role: input.role,
      title: existing.title,
      updatedById: input.updatedById,
      userId: input.userId,
      workspaceId: input.workspaceId,
    });
    return page === null ? Result.fail(new PageAccessDeniedError()) : Result.ok(page);
  }

  /**
   * A page's name changed on its own, without the writing being touched.
   *
   * Renaming from a list is not the same act as editing a page: no new version
   * is cut for it, because nothing anyone wrote has changed.
   */
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

  /**
   * Locks a page against edits, or lets it be written in again.
   *
   * Whoever may write in a page may also decide it should stop being written in,
   * and undo that decision: a lock nobody present can lift is a page lost to the
   * person who locked it by mistake.
   */
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

  /**
   * Vouches for a page, or takes that back — whoever may write in it may also vouch for it.
   *
   * Verifying again with a new date is treated as the same act repeated, not a
   * separate rule: it re-stamps who verified it and when, which is how an
   * expiration gets pushed out without a second endpoint to keep in sync.
   */
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

  /** Only somebody who actually belongs to the workspace can be handed a page to answer for. */
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

  /**
   * The pages somebody was given, across every space they can reach.
   *
   * A page belongs to whoever is named in a property its collection calls a
   * person; the schema is asked once per collection rather than once per page,
   * since pages of the same collection answer to the same one.
   */
  async listAssignedTo(userId: string, workspaceId: string, role: UserRole): Promise<readonly PageSummary[]> {
    const pages = await this.pageRepository.listWithProperties(workspaceId, userId, role);
    const personKeysByParentId = new Map<string, readonly string[]>();
    const assigned: PageSummary[] = [];
    for (const page of pages) {
      const parentId = page.parentId;
      if (parentId === null) continue;
      if (!personKeysByParentId.has(parentId)) {
        const properties = await this.pageSchemaRepository.resolveSchemaProperties(parentId);
        personKeysByParentId.set(
          parentId,
          properties
            .filter((property) => property.type === DatabasePropertyType.PERSON)
            .map((property) => property.key),
        );
      }
      const personKeys = personKeysByParentId.get(parentId) ?? [];
      if (isPageAssignedTo(page.propertyValues, personKeys, userId)) assigned.push(page);
    }
    return assigned;
  }

  async listMoveDestinations(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<PageMoveDestinations, PageAccessDeniedError>> {
    if (role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const destinations = await this.pageRepository.listMoveDestinations(pageId, workspaceId, userId, role);
    return destinations === null ? Result.fail(new PageAccessDeniedError()) : Result.ok(destinations);
  }

  /** Rearranging sisters is not moving a page: nothing changes hands, so nobody else has to be told. */
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
    pageId: string,
    parentId: null | string,
    targetSpaceId: null | string,
    userId: string,
    workspaceId: string,
    mutationId: string,
    role: UserRole,
  ): Promise<
    Result<PageSummary, PageAccessDeniedError | PageCycleError | PageParentError | PagePropertyConformanceError>
  > {
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
    const page = await this.pageRepository.move(
      pageId,
      parentId,
      destinationSpaceId,
      userId,
      workspaceId,
      role,
      mutationId,
    );
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
  ): Promise<readonly TrashedPageSummary[]> {
    return this.pageRepository.listTrashed(workspaceId, userId, role, spaceId, search);
  }

  async deleteForever(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<true, PageAccessDeniedError | PageLifecycleError>> {
    if (role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const outcome = await this.pageRepository.deleteForever(pageId, workspaceId, userId, role);
    if (outcome === 'NOT_FOUND') return Result.fail(new PageAccessDeniedError());
    if (outcome === 'NOT_TRASHED') return Result.fail(new PageLifecycleError());
    await this.cleanupAttachments([pageId]);
    return Result.ok(true);
  }

  async emptyTrash(
    workspaceId: string,
    userId: string,
    role: UserRole,
    spaceId: null | string,
  ): Promise<Result<{ deletedCount: number }, PageAccessDeniedError>> {
    if (role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const deletedPageIds = await this.pageRepository.emptyTrash(workspaceId, userId, role, spaceId);
    await this.cleanupAttachments(deletedPageIds);
    return Result.ok({ deletedCount: deletedPageIds.length });
  }

  /** Whether a page may hang where it is being sent: a real parent there, and not one of its own. */
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

  private validateWritableContent(
    role: UserRole,
    content: Prisma.InputJsonValue,
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

  /**
   * Un archivo que no se pudo borrar del almacén queda escrito en la bitácora.
   *
   * La página se va igual —la fila ya no está y no se va a volver atrás por
   * esto—, pero un archivo que sobrevive a su página ocupa sitio sin que nadie
   * lo sepa, y nadie va a buscarlo si el fallo no dejó rastro.
   */
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

  private async resolvePropertyValuesForWrite(
    parentId: null | string,
    workspaceId: string,
    title: string,
    propertyValues: Readonly<Record<string, unknown>> | null,
  ): Promise<Result<SchemaPropertyValues | null, PagePropertyValidationError>> {
    const schemaProperties = await this.pageSchemaRepository.resolveSchemaProperties(parentId);
    const personIds = await this.resolvePersonIdsIfNeeded(schemaProperties, workspaceId);
    return validatePageProperties(schemaProperties, title, propertyValues, personIds);
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
