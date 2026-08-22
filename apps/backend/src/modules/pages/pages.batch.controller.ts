import { Result, type UserRole } from '@company-brain/shared';
import { Body, Controller, Inject, Patch, Post, UseGuards } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import type { DomainError } from '../../common/domain/domain.error';
import { MutationId } from '../../common/infrastructure/decorators/mutation-id.decorator';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import { mapWithBoundedConcurrency } from '../../common/utils/concurrency.utils';
import { PAGE_BATCH_CONCURRENCY } from './constants/pages.constants';
import type { PageBatchOutcome } from './dto/page.batch.dto';
import { PageBatchMoveDto } from './dto/page.batch.move.dto';
import { PageBatchTrashDto } from './dto/page.batch.trash.dto';
import { PagesService } from './pages.service';

/**
 * Moving or trashing several pages at once, composed from the same moves the
 * service already offers one page at a time.
 *
 * Selecting a mother and one of her own descendants is not two separate
 * requests to the same page: only the mother is asked to move or to go to the
 * trash, and whatever she carries with her — cascade already does that — is
 * reported as succeeded alongside her, never attempted a second time.
 */
@Controller('pages/batch')
export class PagesBatchController {
  constructor(
    private readonly pagesService: PagesService,
    private readonly workspaceContextService: WorkspaceContextService,
    @Inject(Logger) private readonly logger: Logger,
  ) {}

  @Post('trash')
  @UseGuards(JwtAuthGuard)
  async trash(
    @Body() dto: PageBatchTrashDto,
    @MutationId() mutationId: string,
    @User('payload') payload: TokenPayload,
  ): Promise<PageBatchOutcome> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    return this.runBatch(dto.pageIds, workspace.id, payload, 'trash', (pageId) =>
      this.pagesService.trash(pageId, payload.sub, workspace.id, mutationId, payload.role),
    );
  }

  @Patch('move')
  @UseGuards(JwtAuthGuard)
  async move(
    @Body() dto: PageBatchMoveDto,
    @MutationId() mutationId: string,
    @User('payload') payload: TokenPayload,
  ): Promise<PageBatchOutcome> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    return this.runBatch(dto.pageIds, workspace.id, payload, 'move', async (pageId) => {
      const result = await this.pagesService.move(
        pageId,
        dto.parentId ?? null,
        dto.targetSpaceId ?? null,
        payload.sub,
        workspace.id,
        mutationId,
        payload.role,
      );
      return result.isFail() ? Result.fail(result.getError()) : Result.ok(true);
    });
  }

  private async runBatch(
    pageIds: readonly string[],
    workspaceId: string,
    payload: TokenPayload,
    operation: string,
    applyToPage: (pageId: string) => Promise<boolean | Result<boolean, DomainError>>,
  ): Promise<PageBatchOutcome> {
    const selection = await this.resolveSelection(pageIds, workspaceId, payload.sub, payload.role);
    const succeededIds = new Set<string>();
    const failedIds = new Set<string>(selection.unreachableIds);

    await mapWithBoundedConcurrency(selection.topLevelIds, PAGE_BATCH_CONCURRENCY, async (pageId) => {
      if (await this.applySucceeded(pageId, operation, applyToPage)) succeededIds.add(pageId);
      else failedIds.add(pageId);
    });

    for (const [coveredId, ancestorId] of selection.coveredIdsByAncestor) {
      if (succeededIds.has(ancestorId)) succeededIds.add(coveredId);
      else failedIds.add(coveredId);
    }

    return {
      failedIds: pageIds.filter((pageId) => failedIds.has(pageId)),
      succeededIds: pageIds.filter((pageId) => succeededIds.has(pageId)),
    };
  }

  private async applySucceeded(
    pageId: string,
    operation: string,
    applyToPage: (pageId: string) => Promise<boolean | Result<boolean, DomainError>>,
  ): Promise<boolean> {
    try {
      const outcome = await applyToPage(pageId);
      return typeof outcome === 'boolean' ? outcome : !outcome.isFail();
    } catch (error) {
      this.logger.error(
        {
          errorType: error instanceof Error ? error.name : 'UnknownError',
          errorMessage: error instanceof Error ? error.message : String(error),
          operation,
          pageId,
        },
        'Page batch operation failed for one page',
      );
      return false;
    }
  }

  /**
   * Sorts the requested ids into what to act on directly and what is already
   * spoken for by an ancestor in the same request — walked through the real
   * parent chain, not just the pages the caller happened to select, since
   * cascade reaches every descendant regardless of who else was picked.
   */
  private async resolveSelection(
    pageIds: readonly string[],
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<{
    coveredIdsByAncestor: ReadonlyMap<string, string>;
    topLevelIds: readonly string[];
    unreachableIds: readonly string[];
  }> {
    const selectedIds = new Set(pageIds);
    const parentCache = new Map<string, null | string>();
    const unreachableCache = new Set<string>();
    const resolveParentId = this.buildParentIdResolver(workspaceId, userId, role, parentCache, unreachableCache);

    const coveredIdsByAncestor = new Map<string, string>();
    const topLevelIds: string[] = [];
    const unreachableIds: string[] = [];

    await Promise.all(
      pageIds.map(async (pageId) => {
        const ancestorId = await this.findSelectedAncestor(pageId, selectedIds, resolveParentId);
        if (ancestorId === undefined) unreachableIds.push(pageId);
        else if (ancestorId === null) topLevelIds.push(pageId);
        else coveredIdsByAncestor.set(pageId, ancestorId);
      }),
    );

    return { coveredIdsByAncestor, topLevelIds, unreachableIds };
  }

  private buildParentIdResolver(
    workspaceId: string,
    userId: string,
    role: UserRole,
    parentCache: Map<string, null | string>,
    unreachableCache: Set<string>,
  ): (pageId: string) => Promise<null | string | undefined> {
    return async (pageId) => {
      if (unreachableCache.has(pageId)) return;
      if (parentCache.has(pageId)) return parentCache.get(pageId) ?? null;
      const result = await this.pagesService.getAccessible(pageId, workspaceId, userId, role);
      if (result.isFail()) {
        unreachableCache.add(pageId);
        return;
      }
      const parentId = result.getValue().parentId;
      parentCache.set(pageId, parentId);
      return parentId;
    };
  }

  /** `undefined` when the page cannot be reached, `null` when nothing above it was also selected. */
  private async findSelectedAncestor(
    pageId: string,
    selectedIds: ReadonlySet<string>,
    resolveParentId: (pageId: string) => Promise<null | string | undefined>,
  ): Promise<null | string | undefined> {
    const visited = new Set<string>([pageId]);
    let currentId = pageId;

    for (;;) {
      const parentId = await resolveParentId(currentId);
      if (parentId === undefined) return currentId === pageId ? undefined : null;
      if (parentId === null || visited.has(parentId)) return null;
      if (selectedIds.has(parentId)) return parentId;
      visited.add(parentId);
      currentId = parentId;
    }
  }
}
