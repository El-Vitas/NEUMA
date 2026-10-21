import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { NeumaSqlRunner } from '../../../../prisma/types/prisma.types';
import { PLAIN_TEXT } from '../../constants/page-query.sql.constants';
import type { ChangedRow, ReadChangedRowsInput } from '../../types/page-changes.types';
import { frag, sqlParameter, sqlText, sqlTextList, toRawStatement } from './page-query.sql.lib';

const toTransactionId = (value: unknown): string => String(value);

/** Reads which rows of a collection were written, by the id of the transaction that wrote them (ADR 026). */
@Injectable()
export class PageChangesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The oldest transaction still open when this statement started. Every transaction that commits after it has an
   * id at or above it, so a cursor at this value cannot miss a later commit. It must be read before the rows it
   * stands for, so those rows are at least as new as the cursor.
   */
  async readWatermark(runner: NeumaSqlRunner): Promise<string> {
    const plan = this.prisma.sql`SELECT pg_snapshot_xmin(pg_current_snapshot())::text AS "watermark"`
      .returnsRow({ watermark: PLAIN_TEXT })
      .build();
    const [row] = await runner.query(plan);
    if (row === undefined) throw new Error('The database did not answer the snapshot watermark');
    return toTransactionId(row.watermark);
  }

  /** Rows written by a transaction from `since` on, oldest first, one more than the limit to know if there are more. */
  async readChangedRows(runner: NeumaSqlRunner, input: ReadChangedRowsInput): Promise<readonly ChangedRow[]> {
    const after =
      input.after === null
        ? sqlText('TRUE')
        : frag`("changeXid", "id") > (${sqlParameter(input.after.xid, 'text')}::bigint, ${sqlParameter(input.after.id, 'text')})`;
    const denied =
      input.deniedIds.length === 0 ? sqlText('TRUE') : frag`NOT ("id" = ANY(${sqlTextList(input.deniedIds)}))`;
    const statement = frag`SELECT "id", "lifecycle"::text AS "lifecycle", "changeXid"::text AS "xid"
      FROM "Block"
      WHERE "parentId" = ${sqlParameter(input.collectionId, 'text')} AND "type" = 'page'
        AND "changeXid" >= ${sqlParameter(input.since, 'text')}::bigint AND ${after} AND ${denied}
      ORDER BY "changeXid", "id"
      LIMIT ${sqlText(String(input.limit + 1))}`;
    const plan = toRawStatement(this.prisma.sql, statement)
      .returnsRow({ id: PLAIN_TEXT, lifecycle: PLAIN_TEXT, xid: PLAIN_TEXT })
      .build();
    const rows = await runner.query(plan);
    return rows.map((row) => ({
      id: row.id,
      isActive: row.lifecycle === 'ACTIVE',
      xid: toTransactionId(row.xid),
    }));
  }

  /** The active rows of the collection that the reader may read. */
  async countReadableRows(runner: NeumaSqlRunner, collectionId: string, deniedIds: readonly string[]): Promise<number> {
    const denied = deniedIds.length === 0 ? sqlText('TRUE') : frag`NOT ("id" = ANY(${sqlTextList(deniedIds)}))`;
    const statement = frag`SELECT count(*)::text AS "total" FROM "Block"
      WHERE "parentId" = ${sqlParameter(collectionId, 'text')} AND "type" = 'page' AND "lifecycle" = 'ACTIVE'
        AND ${denied}`;
    const plan = toRawStatement(this.prisma.sql, statement).returnsRow({ total: PLAIN_TEXT }).build();
    const [row] = await runner.query(plan);
    return Number(row?.total ?? 0);
  }
}
