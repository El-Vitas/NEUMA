import { DatabasePropertyType, PageLifecycle } from '@company-brain/db';
import type { Prisma } from '@company-brain/db/generated';
import { type PageContent, Result, USER_ROLE, type UserRole } from '@company-brain/shared';
import { Inject, Injectable } from '@nestjs/common';
import { STORAGE_PROVIDER } from '../../common/constants/storage.constants';
import type { SchemaPropertyDefinition, SchemaPropertyValues } from '../../common/domain/schema.domain.types';
import type { IStorageProvider } from '../../common/types/storage.types';
import {
  PAGE_ATTACHMENTS_CLEANUP_REPOSITORY,
  PAGE_REPOSITORY,
  PAGE_SCHEMA_REPOSITORY,
  REDACTED_MENTION_LABEL,
} from './constants/pages.constants';
import { hasValidPageParent, isPageMoveAllowed, validatePageContent } from './domain/page.domain';
import {
  PageAccessDeniedError,
  PageContentValidationError,
  PageCycleError,
  PageLifecycleError,
  PageParentError,
  PagePropertyConformanceError,
  PagePropertyValidationError,
} from './domain/page.error';
import { extractMentionTargetPageIds, redactUnreadableMentions } from './domain/page-mention.domain';
import { validatePageProperties } from './domain/page-schema.domain';
import type {
  CreatePageInput,
  PageAttachmentsCleanupRepositoryContract,
  PageDescendantsPreview,
  PageRepositoryContract,
  PageRestoreOutcome,
  PageSummary,
  TrashedPageSummary,
  UpdatePageInput,
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
  ): Promise<Result<PageSummary, PageAccessDeniedError | PageContentValidationError | PagePropertyValidationError>> {
    const content = this.validateWritableContent(role, input.content);
    if (content.isFail()) return Result.fail(content.getError());
    const existingPage = await this.pageRepository.getAccessible(
      input.pageId,
      input.workspaceId,
      input.userId,
      input.role,
    );
    if (existingPage === null) return Result.fail(new PageAccessDeniedError());
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

  async move(
    pageId: string,
    parentId: null | string,
    userId: string,
    workspaceId: string,
    mutationId: string,
    role: UserRole,
  ): Promise<
    Result<PageSummary, PageAccessDeniedError | PageCycleError | PageParentError | PagePropertyConformanceError>
  > {
    if (role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const context = await this.pageRepository.findMoveContext(pageId, workspaceId, userId, role);
    if (context === null) return Result.fail(new PageAccessDeniedError());
    if (!hasValidPageParent(pageId, parentId, context.pages)) return Result.fail(new PageParentError());
    if (!isPageMoveAllowed(pageId, parentId, context.pages)) return Result.fail(new PageCycleError());
    const conformance = await this.resolvePropertyValuesForWrite(
      parentId,
      workspaceId,
      context.title,
      context.propertyValues,
    );
    if (conformance.isFail()) return Result.fail(new PagePropertyConformanceError(conformance.getError().details));
    const page = await this.pageRepository.move(pageId, parentId, userId, workspaceId, role, mutationId);
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

  validateMove(
    pageId: string,
    parentId: null | string,
    pages: readonly { id: string; parentId: null | string; spaceId: string }[],
  ): Result<true, PageCycleError | PageParentError> {
    if (!hasValidPageParent(pageId, parentId, pages)) return Result.fail(new PageParentError());
    return isPageMoveAllowed(pageId, parentId, pages) ? Result.ok(true) : Result.fail(new PageCycleError());
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

  private async cleanupAttachments(pageIds: readonly string[]): Promise<void> {
    if (pageIds.length === 0) return;
    const storageKeys = await this.pageAttachmentsCleanupRepository.listStorageKeysForPages(pageIds);
    await this.pageAttachmentsCleanupRepository.deleteForPages(pageIds);
    await Promise.allSettled(storageKeys.map((storageKey) => this.storageProvider.delete(storageKey)));
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
