import { Inject, Injectable } from '@nestjs/common';
import { PageLifecycle } from '@neuma/db';
import type { PageQueryAggregationItem } from '@neuma/shared';
import { Result } from '@neuma/shared';
import { Logger } from 'nestjs-pino';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { NeumaSqlRunner } from '../../../../prisma/types/prisma.types';
import {
  NULLABLE_TEXT,
  PLAIN_TEXT,
  POSTGRES_QUERY_CANCELED,
  ROW,
  SQL_TRUE,
} from '../../constants/page-query.sql.constants';
import { PAGE_QUERY_RESTRICTED_ROW_LIMIT, PAGE_QUERY_STATEMENT_TIMEOUT_MS } from '../../constants/pages.constants';
import type { PageQueryCursorStaleError } from '../../domain/page-query.error';
import { PageQueryTimeoutError, PageQueryTooManyRestrictedRowsError } from '../../domain/page-query.error';
import type { GroupingPlan } from '../../domain/page-query.grouping.domain.types';
import type { PageViewer } from '../../types/page.block.types';
import type {
  AggregateResult,
  CellContext,
  GroupAxis,
  GroupLine,
  OrderColumn,
  QueryScope,
  QueryScopeInput,
  ResultRow,
  RowPage,
  RowSpec,
  SqlFragment,
} from '../../types/page-query.sql.types';
import { decodeCursor, encodeCursor } from '../../utils/page-query.cursor.utils';
import { PageBlockReader } from './page.block.reader';
import { aggregateColumnsSql, aggregateSql } from './page-query.aggregate.sql';
import { filterSql } from './page-query.filter.sql';
import { groupJoinSql, groupKeyOf } from './page-query.group.sql';
import {
  afterCursorSql,
  buildOrderColumns,
  orderBySql,
  orderValuesSql,
  positionJoin,
  positionsSql,
} from './page-query.order.sql';
import { searchSql } from './page-query.search.sql';
import { allOf, frag, negate, sqlParameter, sqlText, sqlTextList, toRawStatement } from './page-query.sql.lib';

const isStatementTimeout = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === POSTGRES_QUERY_CANCELED;

const rowColumn = (column: string): SqlFragment => sqlText(`"${ROW}"."${column}"`);

const keyColumns = (columns: readonly OrderColumn[]): RowSpec =>
  Object.fromEntries(columns.map((_, index) => [`k${String(index)}`, NULLABLE_TEXT]));

const keyValues = (row: ResultRow, count: number): (string | null)[] =>
  Array.from({ length: count }, (_, index) => {
    const value = row[`k${String(index)}`];
    return typeof value === 'string' ? value : null;
  });

const textOrNull = (value: unknown): string | null => (typeof value === 'string' ? value : null);

/** Turns a plan into SQL and reads it back. It is the only place that knows the rows of a collection are blocks. */
@Injectable()
export class PageQueryRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockReader: PageBlockReader,
    @Inject(Logger) private readonly logger: Logger,
  ) {}

  private failTooManyRestricted(collectionId: string): Result<never, PageQueryTooManyRestrictedRowsError> {
    const error = new PageQueryTooManyRestrictedRowsError(collectionId);
    this.logger.error(
      { collectionId, errorType: error.name, limit: PAGE_QUERY_RESTRICTED_ROW_LIMIT, stack: error.stack },
      'A collection has more rows closed to a reader than a query can exclude',
    );
    return Result.fail(error);
  }

  /** Runs the reducers of one request in one read-only snapshot, cancelled if it takes too long. */
  async inSnapshot<Value>(work: (runner: NeumaSqlRunner) => Promise<Value>): Promise<Value> {
    try {
      return await this.prisma.transaction(async (transaction) => {
        // The planner takes the list of positions (`unnest`) for ten rows long, so it joins it by a nested loop that
        // rereads it once per row: 223 ms for two thousand rows, against 6 ms with a hash join.
        await transaction.execute(
          this.prisma
            .sql`SELECT set_config('statement_timeout', ${String(PAGE_QUERY_STATEMENT_TIMEOUT_MS)}, true)::text, set_config('enable_nestloop', 'off', true)::text`
            .affectedCount()
            .build(),
        );
        return work(transaction);
      });
    } catch (error) {
      if (isStatementTimeout(error)) throw new PageQueryTimeoutError();
      throw error;
    }
  }

  /** The rows of the collection the reader cannot open, among the few that declare permissions of their own. */
  async readClosedRowIds(
    collectionId: string,
    viewer: PageViewer,
    options: { readonly includeInactive: boolean },
  ): Promise<Result<readonly string[], PageQueryTooManyRestrictedRowsError>> {
    const declared = await this.prisma.models.Block.select('id')
      .where({ parentId: collectionId, type: 'page' })
      .where((block) => block.permissions.isNotNull())
      .all();
    if (declared.length > PAGE_QUERY_RESTRICTED_ROW_LIMIT) return this.failTooManyRestricted(collectionId);
    const blocks = await this.blockReader.readPageBlocks(declared.map((row) => row.id));
    const readable = new Set((await this.blockReader.keepAccessible(blocks, viewer)).map(({ block }) => block.id));
    const closed = declared.filter((row) => !readable.has(row.id)).map((row) => row.id);
    const inactive = options.includeInactive ? await this.readInactiveRowIds(collectionId) : [];
    const all = [...new Set([...closed, ...inactive])];
    return all.length > PAGE_QUERY_RESTRICTED_ROW_LIMIT ? this.failTooManyRestricted(collectionId) : Result.ok(all);
  }

  /** Whether the reader may open the collection at all; a relation to one they cannot open shows nothing. */
  async canOpen(collectionId: string, viewer: PageViewer): Promise<boolean> {
    const blocks = await this.blockReader.readPageBlocks([collectionId]);
    return (await this.blockReader.keepAccessible(blocks, viewer)).length > 0;
  }

  buildScope(input: QueryScopeInput): QueryScope {
    const properties = new Map(input.properties.map((property) => [property.key, property]));
    const context: CellContext = { unreadableRelations: input.unreadableRelations };
    const conditions = [
      frag`${rowColumn('parentId')} = ${sqlParameter(input.collectionId, 'text')}`,
      frag`${rowColumn('type')} = 'page'`,
      frag`${rowColumn('lifecycle')} = 'ACTIVE'`,
      input.deniedIds.length === 0
        ? SQL_TRUE
        : negate(frag`(${rowColumn('id')} = ANY(${sqlTextList(input.deniedIds)}))`),
      input.filter === null ? SQL_TRUE : filterSql(input.filter, properties, context),
      input.search === null ? SQL_TRUE : searchSql(input.search, input.properties),
    ];
    return {
      baseWhere: allOf(conditions),
      collectionId: input.collectionId,
      context,
      onStatement: input.onStatement ?? null,
      orderColumns: buildOrderColumns(input.sorts, properties, context),
      properties,
      runner: input.runner,
      signature: input.signature,
      viewId: input.viewId,
    };
  }

  /** One page of rows in the order of the scope, starting after the cursor. */
  async readPage(
    scope: QueryScope,
    options: {
      readonly cursor: string | null;
      readonly extraJoins?: SqlFragment | undefined;
      readonly extraWhere?: SqlFragment | undefined;
      readonly limit: number;
    },
  ): Promise<Result<RowPage, PageQueryCursorStaleError>> {
    const after = this.readAfter(scope, options.cursor);
    if (after.isFail()) return Result.fail(after.getError());
    const columns = scope.orderColumns;
    const statement = frag`WITH ${positionsSql(scope.collectionId, scope.viewId)}
      SELECT ${rowColumn('id')} AS "id", ${orderValuesSql(columns)}
      FROM "Block" AS "${sqlText(ROW)}" ${positionJoin} ${options.extraJoins ?? sqlText('')}
      WHERE ${scope.baseWhere} AND ${after.getValue()} AND ${options.extraWhere ?? SQL_TRUE}
      ORDER BY ${orderBySql(columns)}
      LIMIT ${sqlText(String(options.limit + 1))}`;
    const rows = await this.run(scope, statement, { id: PLAIN_TEXT, ...keyColumns(columns) });
    return Result.ok(this.toPage(scope, rows, options.limit));
  }

  /** The keys a grouping takes on among the rows the scope lets through, in order, one more than asked for. */
  async readGroupKeys(scope: QueryScope, plan: GroupingPlan, limit: number): Promise<readonly string[]> {
    const rows = await this.run(
      scope,
      frag`SELECT DISTINCT ${groupKeyOf('g')} AS "key"
        FROM "Block" AS "${sqlText(ROW)}" ${groupJoinSql(plan, scope.context, 'g')}
        WHERE ${scope.baseWhere} AND ${groupKeyOf('g')} IS NOT NULL
        ORDER BY 1
        LIMIT ${sqlText(String(limit + 1))}`,
      { key: PLAIN_TEXT },
    );
    return rows.map((row) => String(row.key));
  }

  /**
   * The first rows of every group, or of every cell with a subgrouping, in one pass: each row is ranked inside its
   * group and the ones past the limit are dropped. The axes say which groups the caller wants to show.
   */
  async readGroupPages(
    scope: QueryScope,
    main: GroupAxis,
    sub: GroupAxis | null,
    rowsPerGroup: number,
  ): Promise<readonly GroupLine[]> {
    const columns = scope.orderColumns;
    const subKey = sub === null ? sqlText('NULL::text') : groupKeyOf('g1');
    const partition = sub === null ? groupKeyOf('g0') : frag`${groupKeyOf('g0')}, ${groupKeyOf('g1')}`;
    const subJoin = sub === null ? sqlText('') : groupJoinSql(sub.plan, scope.context, 'g1');
    const statement = frag`WITH ${positionsSql(scope.collectionId, scope.viewId)}
      SELECT * FROM (
        SELECT ${rowColumn('id')} AS "id", ${groupKeyOf('g0')} AS "gk", ${subKey} AS "sk", ${orderValuesSql(columns)},
          (row_number() OVER (PARTITION BY ${partition} ORDER BY ${orderBySql(columns)}))::text AS "rn"
        FROM "Block" AS "${sqlText(ROW)}" ${positionJoin}
          ${groupJoinSql(main.plan, scope.context, 'g0')} ${subJoin}
        WHERE ${scope.baseWhere} AND ${main.inclusion} AND ${sub === null ? SQL_TRUE : sub.inclusion}
      ) AS "ranked"
      WHERE "rn"::int <= ${sqlText(String(rowsPerGroup + 1))}
      ORDER BY "gk" NULLS LAST, "sk" NULLS LAST, "rn"::int`;
    const rows = await this.run(scope, statement, {
      gk: NULLABLE_TEXT,
      id: PLAIN_TEXT,
      rn: PLAIN_TEXT,
      sk: NULLABLE_TEXT,
      ...keyColumns(columns),
    });
    return this.toGroupLines(scope, rows, rowsPerGroup);
  }

  async readAggregates(
    scope: QueryScope,
    items: readonly PageQueryAggregationItem[],
    grouping: { readonly main: GroupingPlan; readonly sub: GroupingPlan | null } | null,
  ): Promise<AggregateResult> {
    const aggregates = items.map((item) => ({ id: item.id, sql: aggregateSql(item, scope.properties, scope.context) }));
    const present = aggregates.flatMap((aggregate) =>
      aggregate.sql === null ? [] : [{ id: aggregate.id, sql: aggregate.sql }],
    );
    const spec: RowSpec = Object.fromEntries(present.map((_, index) => [`a${String(index)}`, NULLABLE_TEXT]));
    const columns = present.length === 0 ? sqlText('') : frag`${aggregateColumnsSql(present)}, `;
    const totalRows = await this.run(
      scope,
      frag`SELECT ${columns}count(DISTINCT ${rowColumn('id')})::text AS "distinct"
        FROM "Block" AS "${sqlText(ROW)}" WHERE ${scope.baseWhere}`,
      { ...spec, distinct: PLAIN_TEXT },
    );
    const total: ResultRow = totalRows[0] ?? {};
    const groupRows = grouping === null ? [] : await this.readAggregateGroups(scope, present, spec, grouping);
    const valuesOf = (row: ResultRow): (string | null)[] =>
      aggregates.map((aggregate) => {
        const index = present.findIndex((candidate) => candidate.id === aggregate.id);
        return index === -1 ? null : textOrNull(row[`a${String(index)}`]);
      });
    return {
      distinctRowCount: Number(total.distinct ?? 0),
      groups: groupRows.map((row) => ({ key: textOrNull(row.gk), subKey: textOrNull(row.sk), values: valuesOf(row) })),
      totals: valuesOf(total),
    };
  }

  private async readInactiveRowIds(collectionId: string): Promise<readonly string[]> {
    const rows = await this.prisma.models.Block.select('id')
      .where({ parentId: collectionId, type: 'page' })
      .where({ lifecycle: PageLifecycle.TRASHED })
      .all();
    return rows.map((row) => row.id);
  }

  private async readAggregateGroups(
    scope: QueryScope,
    present: readonly { readonly id: string; readonly sql: SqlFragment }[],
    spec: RowSpec,
    grouping: { readonly main: GroupingPlan; readonly sub: GroupingPlan | null },
  ): Promise<readonly ResultRow[]> {
    const { main, sub } = grouping;
    const keys = sub === null ? groupKeyOf('g0') : frag`${groupKeyOf('g0')}, ${groupKeyOf('g1')}`;
    const subKey = sub === null ? sqlText('NULL::text') : groupKeyOf('g1');
    const subJoin = sub === null ? sqlText('') : groupJoinSql(sub, scope.context, 'g1');
    const columns = present.length === 0 ? sqlText('') : frag`, ${aggregateColumnsSql(present)}`;
    return this.run(
      scope,
      frag`SELECT ${groupKeyOf('g0')} AS "gk", ${subKey} AS "sk"${columns}
        FROM "Block" AS "${sqlText(ROW)}" ${groupJoinSql(main, scope.context, 'g0')} ${subJoin}
        WHERE ${scope.baseWhere}
        GROUP BY ${keys}`,
      { ...spec, gk: NULLABLE_TEXT, sk: NULLABLE_TEXT },
    );
  }

  private toPage(scope: QueryScope, rows: readonly ResultRow[], limit: number): RowPage {
    const shown = rows.slice(0, limit);
    const last = shown.at(-1);
    const hasMore = rows.length > limit && last !== undefined;
    return {
      ids: shown.map((row) => String(row.id)),
      nextCursor: hasMore ? encodeCursor(scope.signature, keyValues(last, scope.orderColumns.length)) : null,
    };
  }

  private toGroupLines(scope: QueryScope, rows: readonly ResultRow[], rowsPerGroup: number): readonly GroupLine[] {
    const lines = new Map<string, { key: string | null; rows: ResultRow[]; subKey: string | null }>();
    for (const row of rows) {
      const key = textOrNull(row.gk);
      const subKey = textOrNull(row.sk);
      const identity = JSON.stringify([key, subKey]);
      const line = lines.get(identity) ?? { key, rows: [], subKey };
      line.rows.push(row);
      lines.set(identity, line);
    }
    return [...lines.values()].map((line) => ({
      key: line.key,
      page: this.toPage(scope, line.rows, rowsPerGroup),
      subKey: line.subKey,
    }));
  }

  private readAfter(scope: QueryScope, cursor: string | null): Result<SqlFragment, PageQueryCursorStaleError> {
    if (cursor === null) return Result.ok(SQL_TRUE);
    const decoded = decodeCursor(cursor, scope.signature);
    if (decoded.isFail()) return Result.fail(decoded.getError());
    const { values } = decoded.getValue();
    return Result.ok(
      values.length === scope.orderColumns.length ? afterCursorSql(scope.orderColumns, values) : SQL_TRUE,
    );
  }

  private async run(scope: QueryScope, statement: SqlFragment, spec: RowSpec): Promise<ResultRow[]> {
    await scope.onStatement?.(statement);
    const plan = toRawStatement(this.prisma.sql, statement).returnsRow(spec).build();
    const rows = await scope.runner.query(plan);
    return rows.map((row) => ({ ...row }));
  }
}
