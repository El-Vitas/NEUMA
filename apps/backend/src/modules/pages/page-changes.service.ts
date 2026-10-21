import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@neuma/shared';
import type { DomainError } from '../../common/domain/domain.error';
import type { NeumaSqlRunner } from '../../prisma/types/prisma.types';
import {
  PAGE_CHANGES_DEFAULT_LIMIT,
  PAGE_CHANGES_MAX_LIMIT,
  PAGE_CHANGES_RELATED_LIMIT,
} from './constants/page-changes.constants';
import {
  PAGE_QUERY_CLOCK,
  PAGE_QUERY_DEFAULT_TIME_ZONE,
  PAGE_REPOSITORY,
  PAGE_SCHEMA_REPOSITORY,
} from './constants/pages.constants';
import { PageAccessDeniedError, PageSchemaNotFoundError } from './domain/page.error';
import type { PageQueryTooManyRestrictedRowsError } from './domain/page-query.error';
import { pageCarriesSchema } from './domain/page-schema.domain';
import { PageChangesRepository } from './infrastructure/persistence/page-changes.repository';
import { PageQueryRepository } from './infrastructure/persistence/page-query.repository';
import { PageComputedService } from './page-computed.service';
import type { PageRepositoryContract } from './types/page.types';
import type {
  ChangesCursor,
  FollowRollupsInput,
  LinkedRows,
  PageChanges,
  ReadPageChangesInput,
} from './types/page-changes.types';
import type { PageQueryClock } from './types/page-query.types';
import type { PageSchemaRepositoryContract } from './types/page-schema.types';
import { decodeChangesCursor, encodeChangesCursor } from './utils/page-changes.cursor.utils';

const noLinkedRows = (): LinkedRows => ({ ids: new Set<string>(), isTruncated: false });

/** What changed in a collection since a cursor, for the rows the reader may open and nobody else's (ADR 026). */
@Injectable()
export class PageChangesService {
  constructor(
    @Inject(PAGE_REPOSITORY) private readonly pageRepository: PageRepositoryContract,
    @Inject(PAGE_SCHEMA_REPOSITORY) private readonly pageSchemaRepository: PageSchemaRepositoryContract,
    @Inject(PAGE_QUERY_CLOCK) private readonly clock: PageQueryClock,
    private readonly queryRepository: PageQueryRepository,
    private readonly changesRepository: PageChangesRepository,
    private readonly computedService: PageComputedService,
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
    const viewer = { role, userId, workspaceId };
    const read = await this.queryRepository.inSnapshot(async (runner) => {
      const watermark = await this.changesRepository.readWatermark(runner);
      const total = await this.changesRepository.countReadableRows(runner, pageId, deniedIds);
      if (decoded === null) return { changed: [], linked: Result.ok(noLinkedRows()), total, watermark };
      const changed = await this.changesRepository.readChangedRows(runner, {
        after: decoded.after,
        collectionId: pageId,
        deniedIds,
        limit,
        since: decoded.since,
      });
      const linked =
        decoded.after === null
          ? await this.followRollups(runner, {
              deniedIds,
              properties: schema.properties,
              since: decoded.since,
              viewer,
              pageId,
            })
          : Result.ok(noLinkedRows());
      return { changed, linked, total, watermark };
    });
    if (read.linked.isFail()) return Result.fail(read.linked.getError());
    const shown = read.changed.slice(0, limit);
    const hasMore = read.changed.length > limit;
    const activeIds = shown.filter((row) => row.isActive).map((row) => row.id);
    const shownIds = new Set(shown.map((row) => row.id));
    const linkedIds = [...read.linked.getValue().ids]
      .filter((id) => !shownIds.has(id))
      .slice(0, PAGE_CHANGES_MAX_LIMIT);
    const found = await this.pageSchemaRepository.readRowsById(
      pageId,
      [...activeIds, ...linkedIds],
      workspaceId,
      userId,
      role,
    );
    const computed = await this.computedService.attach(found.rows, {
      collectionId: pageId,
      context: { nowMilliseconds: this.clock.now().getTime(), timeZone: PAGE_QUERY_DEFAULT_TIME_ZONE },
      properties: schema.properties,
      viewer,
    });
    if (computed.isFail()) return Result.fail(computed.getError());
    const linkedSet = new Set(linkedIds);
    return Result.ok({
      attachedFiles: found.attachedFiles,
      cursor: encodeChangesCursor(this.nextCursor(decoded, read.watermark, hasMore ? (shown.at(-1) ?? null) : null)),
      hasMore,
      isReset: input.cursor !== undefined && decoded === null,
      possiblyChanged: computed.getValue().filter((row) => linkedSet.has(row.id)),
      possiblyChangedIsTruncated: read.linked.getValue().isTruncated,
      relatedRows: found.relatedRows,
      rows: computed.getValue().filter((row) => !linkedSet.has(row.id)),
      spaceId: page.spaceId,
      total: read.total,
      trashedIds: shown.filter((row) => !row.isActive).map((row) => row.id),
    });
  }

  /**
   * A rollup changes when a row it summarises does, though its own row is not written. The rows the reader may open
   * that link a related row changed since the cursor are named, so a follower knows where to look (ADR 028).
   */
  private async followRollups(
    runner: NeumaSqlRunner,
    input: FollowRollupsInput,
  ): Promise<Result<LinkedRows, PageQueryTooManyRestrictedRowsError>> {
    const links = new Map<string, Set<string>>();
    for (const property of input.properties) {
      const rollup = property.computed?.rollup;
      if (rollup === null || rollup === undefined) continue;
      links.set(
        rollup.targetCollectionId,
        (links.get(rollup.targetCollectionId) ?? new Set()).add(rollup.relationPropertyKey),
      );
    }
    const ids = new Set<string>();
    let isTruncated = false;
    for (const [targetId, relationKeys] of links) {
      const closed = await this.queryRepository.readClosedRowIds(targetId, input.viewer, { includeInactive: false });
      if (closed.isFail()) return Result.fail(closed.getError());
      if (!(await this.queryRepository.canOpen(targetId, input.viewer))) continue;
      const changed = await this.changesRepository.readChangedRows(runner, {
        after: null,
        collectionId: targetId,
        deniedIds: closed.getValue(),
        limit: PAGE_CHANGES_RELATED_LIMIT,
        since: input.since,
      });
      const targetIds = changed.slice(0, PAGE_CHANGES_RELATED_LIMIT).map((row) => row.id);
      isTruncated ||= changed.length > PAGE_CHANGES_RELATED_LIMIT;
      if (targetIds.length === 0) continue;
      for (const relationKey of relationKeys) {
        const linking = await this.changesRepository.readRowsLinking(runner, {
          collectionId: input.pageId,
          deniedIds: input.deniedIds,
          limit: PAGE_CHANGES_MAX_LIMIT,
          relationKey,
          targetIds,
        });
        isTruncated ||= linking.length > PAGE_CHANGES_MAX_LIMIT;
        for (const id of linking.slice(0, PAGE_CHANGES_MAX_LIMIT)) ids.add(id);
      }
    }
    return Result.ok({ ids, isTruncated: isTruncated || ids.size > PAGE_CHANGES_MAX_LIMIT });
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
