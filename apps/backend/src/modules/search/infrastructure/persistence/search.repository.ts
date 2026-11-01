import { Injectable } from '@nestjs/common';
import { PageLifecycle } from '@neuma/db';
import { BLOCK_TYPE } from '@neuma/shared';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { NeumaSqlRunner } from '../../../../prisma/types/prisma.types';
import {
  SEARCH_ANCESTOR_DEPTH_LIMIT,
  SEARCH_STRICT_WORD_SIMILARITY_SETTING,
  SEARCH_TYPO_WORD_SIMILARITY_THRESHOLD,
} from '../../constants/search.constants';
import { countResults } from '../../domain/search.paging.domain';
import { declaringAncestorsSchema, headingEntriesSchema } from '../../schemas/search.candidate.schemas';
import type {
  SearchCandidate,
  SearchCandidateRequest,
  SearchCandidateRow,
  SearchMatching,
  SearchRepositoryContract,
} from '../../types/search.types';
import { toInitialWindowSize, toWiderWindowSize } from '../../utils/search.window.utils';
import { buildCandidateStatement, buildProbeStatement } from './search.statement';

const toWindowSize = (request: SearchCandidateRequest): number =>
  request.windowSize ?? toInitialWindowSize(request.fetchSize);

@Injectable()
export class SearchRepository implements SearchRepositoryContract {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {}

  /** The statement behind one page of results, for callers that need to look at its plan. */
  buildStatement(request: SearchCandidateRequest, windowSize = toWindowSize(request)) {
    const { sql, tables } = this.prisma;
    const { Block, Space } = tables;
    return buildCandidateStatement(sql, request, windowSize)
      .returnsRow({
        blockId: Block.columns.id,
        blockType: Block.columns.type,
        chain: 'pg/jsonb@1',
        editedAt: Block.columns.editedAt,
        headings: 'pg/jsonb@1',
        icon: { codecId: 'pg/jsonb@1', nullable: true },
        isPageVerified: 'pg/bool@1',
        pageBestId: Block.columns.id,
        pageChain: 'pg/jsonb@1',
        pageId: Block.columns.id,
        pageRank: 'pg/float8@1',
        pageParentId: { codecId: 'pg/text@1', nullable: true },
        pageTitle: Block.columns.text,
        parentPageTitle: { codecId: 'pg/text@1', nullable: true },
        rank: 'pg/float8@1',
        snippet: 'pg/text@1',
        spaceId: Block.columns.spaceId,
        spaceName: Space.columns.name,
      })
      .build();
  }

  /**
   * Looks at the best matches first and widens the window while it holds too few results and left matches out, so
   * the common case walks the ancestors of a few matches however many there are.
   */
  async findCandidates(request: SearchCandidateRequest): Promise<readonly SearchCandidate[]> {
    let windowSize = toWindowSize(request);
    for (;;) {
      const rows = await this.runStatement(request, windowSize);
      const candidates = rows.flatMap((row) => this.toCandidate(row));
      const found = countResults(candidates, request.granularity);
      if (found >= request.fetchSize) return candidates;
      const wider = toWiderWindowSize(windowSize, found, request.fetchSize);
      const matched = await this.countMatches(request, wider);
      if (matched <= windowSize) return candidates;
      windowSize = Math.min(wider, matched);
    }
  }

  /** The page holding the block, or the block itself when it is a page. Visibility is the caller's to check. */
  async locateBlock(blockId: string, workspaceId: string): Promise<readonly string[]> {
    const { sql, tables } = this.prisma;
    const rows = await this.prisma.runner.query(
      sql`
        WITH RECURSIVE "ancestor" AS (
          SELECT "self"."id", "self"."parentId", "self"."type", "self"."spaceId", "self"."lifecycle", 0 AS "depth"
          FROM "Block" AS "self" WHERE "self"."id" = ${blockId}::text AND "self"."alive"
          UNION ALL
          SELECT "above"."id", "above"."parentId", "above"."type", "above"."spaceId", "above"."lifecycle",
            "ancestor"."depth" + 1
          FROM "Block" AS "above" INNER JOIN "ancestor" ON "above"."id" = "ancestor"."parentId"
          WHERE "ancestor"."depth" < ${SEARCH_ANCESTOR_DEPTH_LIMIT}::int4
        )
        SELECT "ancestor"."id" AS "pageId"
        FROM "ancestor"
        INNER JOIN "Space" AS "space" ON "space"."id" = "ancestor"."spaceId"
        WHERE "ancestor"."type" = ${BLOCK_TYPE.page}::text
          AND "ancestor"."lifecycle" = ${PageLifecycle.ACTIVE}::"PageLifecycle"
          AND "space"."workspaceId" = ${workspaceId}::text
        ORDER BY "ancestor"."depth" ASC
        LIMIT 1
      `
        .returnsRow({ pageId: tables.Block.columns.id })
        .build(),
    );
    return rows.map((row) => row.pageId);
  }

  private runStatement(request: SearchCandidateRequest, windowSize: number): Promise<readonly SearchCandidateRow[]> {
    const statement = this.buildStatement(request, windowSize);
    return this.inMatchingMode(request.matching, async (runner) => runner.query(statement));
  }

  /** Matches there are for the request, counted up to one more than the window holds. */
  private async countMatches(request: SearchCandidateRequest, windowSize: number): Promise<number> {
    const { sql, tables } = this.prisma;
    const statement = buildProbeStatement(sql, request, windowSize)
      .returnsRow({ matched: tables.Block.columns.version })
      .build();
    const rows = await this.inMatchingMode(request.matching, async (runner) => runner.query(statement));
    return rows[0]?.matched ?? 0;
  }

  /** The typo operator reads a transaction-local threshold, so it runs inside one; words need no setup. */
  private inMatchingMode<Rows>(
    matching: SearchMatching,
    run: (runner: NeumaSqlRunner) => Promise<Rows>,
  ): Promise<Rows> {
    if (matching === 'words') return run(this.prisma.runner);
    return this.prisma.transaction(async (transaction) => {
      const { sql } = this.prisma;
      await transaction.execute(
        sql`SELECT set_config(${SEARCH_STRICT_WORD_SIMILARITY_SETTING}, ${String(SEARCH_TYPO_WORD_SIMILARITY_THRESHOLD)}, true)`
          .affectedCount()
          .build(),
      );
      return run(transaction);
    });
  }

  /** A row whose stored JSON no longer has the expected shape is left out and logged, never shown unchecked. */
  private toCandidate(row: SearchCandidateRow): SearchCandidate[] {
    const chain = declaringAncestorsSchema.safeParse(row.chain);
    const pageChain = declaringAncestorsSchema.safeParse(row.pageChain);
    const headings = headingEntriesSchema.safeParse(row.headings);
    if (!chain.success || !pageChain.success || !headings.success) {
      this.logger.warn({ blockId: row.blockId }, 'search result left out: its permissions or headings are malformed');
      return [];
    }
    return [{ ...row, chain: chain.data, headings: headings.data, pageChain: pageChain.data }];
  }
}
