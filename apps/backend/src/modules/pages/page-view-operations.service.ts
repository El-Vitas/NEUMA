import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { PageViewWireOperation } from '@neuma/shared';
import { PAGE_VIEW_OPERATION_TABLE, Result, toPageViewEnvelope } from '@neuma/shared';
import { BLOCK_WRITER } from '../../common/constants/block-writer.constants';
import { DomainError } from '../../common/domain/domain.error';
import type { SchemaViewDefinition } from '../../common/domain/schema.domain.types';
import type { BlockWriter } from '../../common/types/block-writer.types';
import { VIEW_OPERATION_DENIED_CODES } from './constants/page-view.constants';
import { PAGE_REPOSITORY, PAGE_SCHEMA_REPOSITORY } from './constants/pages.constants';
import type { PageBlockOperation } from './domain/page.block.domain.types';
import { PageAccessDeniedError, PageViewNotFoundError } from './domain/page.error';
import { PagesService } from './pages.service';
import type { PageRepositoryContract } from './types/page.types';
import type { PageSchemaRepositoryContract } from './types/page-schema.types';
import type { ApplyViewOperationsInput, ChangedView, MoveRowInput } from './types/page-view-operations.types';

/** A view operation the pipeline turned down, with the reason it gave. */
export class PageViewOperationRejectedError extends DomainError {
  public readonly code: string;
  public readonly httpStatus = 400;

  constructor(code: string, message: string, details: unknown) {
    super(message, details);
    this.code = code;
  }
}

const toEnvelope = (viewId: string, operation: PageViewWireOperation): PageBlockOperation => ({
  args: operation.args,
  command: operation.command,
  path: operation.path,
  pointer: { id: viewId, table: PAGE_VIEW_OPERATION_TABLE },
});

@Injectable()
export class PageViewOperationsService {
  constructor(
    @Inject(PAGE_REPOSITORY) private readonly pageRepository: PageRepositoryContract,
    @Inject(PAGE_SCHEMA_REPOSITORY) private readonly pageSchemaRepository: PageSchemaRepositoryContract,
    @Inject(BLOCK_WRITER) private readonly blockWriter: BlockWriter,
    private readonly pagesService: PagesService,
  ) {}

  /** Changes a view by operations, all or none: two people changing different keys of it never undo each other. */
  async apply(input: ApplyViewOperationsInput): Promise<Result<ChangedView, DomainError>> {
    const page = await this.pageRepository.getAccessible(input.pageId, input.workspaceId, input.userId, input.role);
    if (page === null) return Result.fail(new PageAccessDeniedError());
    const view = await this.findView(input.pageId, input.viewId);
    if (view === null) return Result.fail(new PageViewNotFoundError());
    const response = await this.blockWriter.applyTrusted(
      [
        {
          id: input.mutationId ?? randomUUID(),
          operations: input.operations.map((operation) => toEnvelope(input.viewId, operation)),
          spaceId: page.spaceId,
        },
      ],
      { role: input.role, userId: input.userId, workspaceId: input.workspaceId },
    );
    const outcome = response.transactions[0];
    if (outcome === undefined || 'error' in outcome) {
      const error = outcome === undefined ? undefined : outcome.error;
      if (error === undefined || VIEW_OPERATION_DENIED_CODES.includes(error.code))
        return Result.fail(new PageAccessDeniedError());
      return Result.fail(new PageViewOperationRejectedError(error.code, error.message, error.details));
    }
    const changed = await this.findView(input.pageId, input.viewId);
    return changed?.id === undefined || changed.version === undefined
      ? Result.fail(new PageViewNotFoundError())
      : Result.ok({ configuration: changed.configuration, id: changed.id, version: changed.version });
  }

  /**
   * A card dropped in a column: the row takes the value of the column and the view puts it beside a neighbour, in
   * one transaction. If either part is refused, the card has not moved at all.
   */
  async moveRow(input: MoveRowInput): Promise<Result<ChangedView, DomainError>> {
    const view = await this.findView(input.pageId, input.viewId);
    if (view === null) return Result.fail(new PageViewNotFoundError());
    const row = await this.pageRepository.getAccessible(input.rowId, input.workspaceId, input.userId, input.role);
    if (row?.parentId !== input.pageId) return Result.fail(new PageAccessDeniedError());
    const placement = this.toPlacement(input);
    const moved = await this.pagesService.updateProperties({
      extraOperations: placement === null ? [] : [placement],
      ...(input.listChanges === undefined ? {} : { listChanges: input.listChanges }),
      pageId: input.rowId,
      propertyValues: input.values,
      role: input.role,
      updatedById: input.userId,
      userId: input.userId,
      workspaceId: input.workspaceId,
    });
    if (moved.isFail()) return Result.fail(moved.getError());
    const changed = await this.findView(input.pageId, input.viewId);
    return changed?.id === undefined || changed.version === undefined
      ? Result.fail(new PageViewNotFoundError())
      : Result.ok({ configuration: changed.configuration, id: changed.id, version: changed.version });
  }

  private toPlacement(input: MoveRowInput): PageBlockOperation | null {
    if (input.after !== undefined) {
      return toPageViewEnvelope(input.viewId, {
        after: input.after,
        command: 'listAfter',
        id: input.rowId,
        list: 'manualOrder',
      });
    }
    if (input.before !== undefined) {
      return toPageViewEnvelope(input.viewId, {
        before: input.before,
        command: 'listBefore',
        id: input.rowId,
        list: 'manualOrder',
      });
    }
    return null;
  }

  private async findView(pageId: string, viewId: string): Promise<SchemaViewDefinition | null> {
    const schema = await this.pageSchemaRepository.getSchema(pageId);
    return schema.views.find((candidate) => candidate.id === viewId) ?? null;
  }
}
