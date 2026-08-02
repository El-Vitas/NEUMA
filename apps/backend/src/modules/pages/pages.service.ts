import { PageLifecycle } from '@company-brain/db';
import { Result, USER_ROLE, type UserRole } from '@company-brain/shared';
import { Inject, Injectable } from '@nestjs/common';
import { PAGE_REPOSITORY } from './constants/pages.constants';
import { hasValidPageParent, isPageMoveAllowed } from './domain/page.domain';
import { PageAccessDeniedError, PageCycleError, PageLifecycleError, PageParentError } from './domain/page.error';
import type { CreatePageInput, PageRepositoryContract, PageSummary, UpdatePageInput } from './types/page.types';

@Injectable()
export class PagesService {
  constructor(@Inject(PAGE_REPOSITORY) private readonly pageRepository: PageRepositoryContract) {}

  async list(
    spaceId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
    includeTrashed = false,
  ): Promise<readonly PageSummary[]> {
    return this.pageRepository.listAccessible(spaceId, workspaceId, userId, role, includeTrashed);
  }

  async getAccessible(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<PageSummary, PageAccessDeniedError>> {
    const page = await this.pageRepository.getAccessible(pageId, workspaceId, userId, role);
    return page === null ? Result.fail(new PageAccessDeniedError()) : Result.ok(page);
  }

  async create(
    input: CreatePageInput,
    role: UserRole,
  ): Promise<Result<PageSummary, PageAccessDeniedError | PageParentError>> {
    if (role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    if (input.parentId !== null && !(await this.pageRepository.parentBelongsToSpace(input.parentId, input.spaceId))) {
      return Result.fail(new PageParentError());
    }
    const page = await this.pageRepository.create(input);
    return page === null ? Result.fail(new PageAccessDeniedError()) : Result.ok(page);
  }

  async update(input: UpdatePageInput, role: UserRole): Promise<Result<PageSummary, PageAccessDeniedError>> {
    if (role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const page = await this.pageRepository.update(input);
    return page === null ? Result.fail(new PageAccessDeniedError()) : Result.ok(page);
  }

  async move(
    pageId: string,
    parentId: null | string,
    userId: string,
    workspaceId: string,
    mutationId: string,
    role: UserRole,
  ): Promise<Result<PageSummary, PageAccessDeniedError | PageCycleError | PageParentError>> {
    if (role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const context = await this.pageRepository.findMoveContext(pageId, workspaceId, userId, role);
    if (context === null) return Result.fail(new PageAccessDeniedError());
    if (!hasValidPageParent(pageId, parentId, context.pages)) return Result.fail(new PageParentError());
    if (!isPageMoveAllowed(pageId, parentId, context.pages)) return Result.fail(new PageCycleError());
    const page = await this.pageRepository.move(pageId, parentId, userId, workspaceId, role, mutationId);
    return page === null ? Result.fail(new PageAccessDeniedError()) : Result.ok(page);
  }

  async trash(
    pageId: string,
    userId: string,
    workspaceId: string,
    mutationId: string,
    role: UserRole,
  ): Promise<Result<boolean, PageAccessDeniedError | PageLifecycleError>> {
    if (role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const updated = await this.pageRepository.setLifecycle(
      pageId,
      PageLifecycle.TRASHED,
      userId,
      workspaceId,
      role,
      mutationId,
    );
    return updated ? Result.ok(true) : Result.fail(new PageLifecycleError());
  }

  async restore(
    pageId: string,
    userId: string,
    workspaceId: string,
    mutationId: string,
    role: UserRole,
  ): Promise<Result<boolean, PageAccessDeniedError | PageLifecycleError>> {
    if (role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const updated = await this.pageRepository.setLifecycle(
      pageId,
      PageLifecycle.ACTIVE,
      userId,
      workspaceId,
      role,
      mutationId,
    );
    return updated ? Result.ok(true) : Result.fail(new PageLifecycleError());
  }

  validateMove(
    pageId: string,
    parentId: null | string,
    pages: readonly { id: string; parentId: null | string; spaceId: string }[],
  ): Result<true, PageCycleError | PageParentError> {
    if (!hasValidPageParent(pageId, parentId, pages)) return Result.fail(new PageParentError());
    return isPageMoveAllowed(pageId, parentId, pages) ? Result.ok(true) : Result.fail(new PageCycleError());
  }
}
