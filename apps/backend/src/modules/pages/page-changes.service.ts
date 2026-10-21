import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@neuma/shared';
import type { DomainError } from '../../common/domain/domain.error';
import { PAGE_CHANGES_DEFAULT_LIMIT, PAGE_CHANGES_MAX_LIMIT } from './constants/page-changes.constants';
import { PAGE_REPOSITORY, PAGE_SCHEMA_REPOSITORY } from './constants/pages.constants';
import { PageAccessDeniedError, PageSchemaNotFoundError } from './domain/page.error';
import { pageCarriesSchema } from './domain/page-schema.domain';
import { PageChangesRepository } from './infrastructure/persistence/page-changes.repository';
import { PageQueryRepository } from './infrastructure/persistence/page-query.repository';
import type { PageRepositoryContract } from './types/page.types';
import type { ChangesCursor, PageChanges, ReadPageChangesInput } from './types/page-changes.types';
import type { PageSchemaRepositoryContract } from './types/page-schema.types';
import { decodeChangesCursor, encodeChangesCursor } from './utils/page-changes.cursor.utils';

/** What changed in a collection since a cursor, for the rows the reader may open and nobody else's (ADR 026). */
@Injectable()
export class PageChangesService {
  constructor(
    @Inject(PAGE_REPOSITORY) private readonly pageRepository: PageRepositoryContract,
    @Inject(PAGE_SCHEMA_REPOSITORY) private readonly pageSchemaRepository: PageSchemaRepositoryContract,
    private readonly queryRepository: PageQueryRepository,
    private readonly changesRepository: PageChangesRepository,
  ) {}

  async read(input: ReadPageChangesInput): Promise<Result<PageChanges, DomainError>> {
    const { pageId, role, userId, workspaceId } = input;
    const page = await this.pageRepository.getAccessible(pageId, workspaceId, userId, role);
    if (page === null) return Result.fail(new PageAccessDeniedError());
    const schema = await this.pageSchemaRepository.getSchema(pageId);
    if (!pageCarriesSchema(schema.properties)) return Result.fail(new PageSchemaNotFoundError());
    const closed = await this.queryRepository.readClosedRowIds(
      pageId,
      { role, userId, workspaceId },
      { includeInactive: false },
    );
    if (closed.isFail()) return Result.fail(closed.getError());
    const deniedIds = [...new Set([...closed.getValue(), ...(input.excludedRowIds ?? [])])];
    const decoded = input.cursor === undefined ? null : decodeChangesCursor(input.cursor);
    const limit = Math.min(PAGE_CHANGES_MAX_LIMIT, Math.max(1, input.limit || PAGE_CHANGES_DEFAULT_LIMIT));
    const read = await this.queryRepository.inSnapshot(async (runner) => {
      const watermark = await this.changesRepository.readWatermark(runner);
      const total = await this.changesRepository.countReadableRows(runner, pageId, deniedIds);
      if (decoded === null) return { changed: [], total, watermark };
      const changed = await this.changesRepository.readChangedRows(runner, {
        after: decoded.after,
        collectionId: pageId,
        deniedIds,
        limit,
        since: decoded.since,
      });
      return { changed, total, watermark };
    });
    const shown = read.changed.slice(0, limit);
    const hasMore = read.changed.length > limit;
    const activeIds = shown.filter((row) => row.isActive).map((row) => row.id);
    const found = await this.pageSchemaRepository.readRowsById(pageId, activeIds, workspaceId, userId, role);
    return Result.ok({
      attachedFiles: found.attachedFiles,
      cursor: encodeChangesCursor(this.nextCursor(decoded, read.watermark, hasMore ? (shown.at(-1) ?? null) : null)),
      hasMore,
      isReset: input.cursor !== undefined && decoded === null,
      relatedRows: found.relatedRows,
      rows: found.rows,
      spaceId: page.spaceId,
      total: read.total,
      trashedIds: shown.filter((row) => !row.isActive).map((row) => row.id),
    });
  }

  /**
   * While the changes are cut, the cursor keeps where the walk started and where it stopped. When the last page is
   * read it moves to the watermark of the first page, so a transaction that committed between two pages is read
   * again by the next walk instead of being skipped.
   */
  private nextCursor(
    decoded: ChangesCursor | null,
    watermark: string,
    stoppedAt: { readonly id: string; readonly xid: string } | null,
  ): ChangesCursor {
    const fresh = decoded?.fresh ?? watermark;
    if (stoppedAt === null || decoded === null) return { after: null, fresh: null, since: fresh };
    return { after: stoppedAt, fresh, since: decoded.since };
  }
}
