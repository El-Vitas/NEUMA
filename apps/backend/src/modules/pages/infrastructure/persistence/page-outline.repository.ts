import { Injectable } from '@nestjs/common';
import { PageLifecycle } from '@neuma/db';
import type { Prisma } from '@neuma/db/generated';
import { parseSchemaPropertyValues } from '../../../../common/infrastructure/persistence/schema-json.adapter';
import { buildSpaceVisibilityFilter } from '../../../../common/infrastructure/persistence/space.visibility.filter';
import { buildTokenScopeWhere } from '../../../../common/infrastructure/persistence/token-scope.filter';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PAGE_OUTLINE_MAX_DEPTH } from '../../constants/pages.constants';
import type {
  PageAncestor,
  PageAncestorRow,
  PageOutlineChildren,
  PageOutlinePlace,
  PageOutlineReader,
  PageOutlineRepositoryContract,
  PageOutlineWindow,
} from '../../types/page-outline.types';

/** Active pages the reader can see, narrowed to the token scope when there is one. */
const readableBy = (reader: PageOutlineReader): Prisma.PageWhereInput => ({
  ...(reader.tokenScope === undefined ? {} : buildTokenScopeWhere(reader.tokenScope)),
  lifecycle: PageLifecycle.ACTIVE,
  space: { ...buildSpaceVisibilityFilter(reader.userId, reader.role), workspaceId: reader.workspaceId },
});

/** Page tree without content, so walking a space stays cheap. Children the reader cannot see are not counted either. */
@Injectable()
export class PageOutlineRepository implements PageOutlineRepositoryContract {
  constructor(private readonly prisma: PrismaService) {}

  async listChildren(
    spaceId: string,
    parentId: string | null,
    reader: PageOutlineReader,
    window: PageOutlineWindow,
  ): Promise<PageOutlineChildren> {
    const where = { ...readableBy(reader), parentId, spaceId };
    const [pages, total] = await Promise.all([
      this.prisma.page.findMany({
        orderBy: [{ order: 'asc' }, { id: 'asc' }],
        select: {
          _count: { select: { children: { where: readableBy(reader) }, schemaProperties: true } },
          id: true,
          propertyValues: true,
          title: true,
        },
        skip: window.skip,
        take: window.take,
        where,
      }),
      this.prisma.page.count({ where }),
    ]);
    const entries = pages.map((page) => ({
      childCount: page._count.children,
      id: page.id,
      isCollection: page._count.schemaProperties > 0,
      propertyValues: parseSchemaPropertyValues(page.propertyValues),
      title: page.title,
    }));
    return { entries, total };
  }

  async listAncestors(pageId: string, reader: PageOutlineReader): Promise<readonly PageAncestor[]> {
    const page = await this.prisma.page.findFirst({
      select: { id: true },
      where: { ...readableBy(reader), id: pageId },
    });
    if (page === null) return [];
    const rows = await this.prisma.$queryRaw<PageAncestorRow[]>`
      WITH RECURSIVE "chain" AS (
        SELECT "id", "parentId", "title", 0 AS "depth" FROM "Page" WHERE "id" = ${pageId}
        UNION ALL
        SELECT "ancestor"."id", "ancestor"."parentId", "ancestor"."title", "chain"."depth" + 1
        FROM "Page" AS "ancestor"
        INNER JOIN "chain" ON "ancestor"."id" = "chain"."parentId"
        WHERE "chain"."depth" < ${PAGE_OUTLINE_MAX_DEPTH}
      )
      SELECT "id", "title" FROM "chain" WHERE "depth" > 0 ORDER BY "depth" DESC
    `;
    const readable = new Set(
      (
        await this.listReadable(
          rows.map((row) => row.id),
          reader,
        )
      ).map((place) => place.id),
    );
    return rows.map(
      (row): PageAncestor =>
        readable.has(row.id)
          ? { id: row.id, isReadable: true, title: row.title }
          : { id: null, isReadable: false, title: null },
    );
  }

  async listReadable(pageIds: readonly string[], reader: PageOutlineReader): Promise<readonly PageOutlinePlace[]> {
    if (pageIds.length === 0) return [];
    return this.prisma.page.findMany({
      select: { id: true, spaceId: true, title: true },
      where: { ...readableBy(reader), id: { in: [...pageIds] } },
    });
  }
}
