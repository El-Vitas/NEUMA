import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class PageVersionRetentionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Past `olderThan`, a page keeps its last version of each day and loses the rest. The newest version of a
   * page is never older than its last edit, so the current content always keeps its history entry.
   */
  async thin(olderThan: Date): Promise<number> {
    const { affectedRows } = await this.prisma.runner.execute(
      this.prisma.sql`
        DELETE FROM "PageVersion" AS "version"
        USING (
          SELECT "id", row_number() OVER (
            PARTITION BY "pageId", date_trunc('day', "createdAt" AT TIME ZONE 'America/Santiago')
            ORDER BY "version" DESC
          ) AS "rank"
          FROM "PageVersion"
          WHERE "createdAt" < ${olderThan.toISOString()}::timestamptz
        ) AS "old"
        WHERE "version"."id" = "old"."id" AND "old"."rank" > 1
      `
        .affectedCount()
        .build(),
    );
    return affectedRows;
  }
}
