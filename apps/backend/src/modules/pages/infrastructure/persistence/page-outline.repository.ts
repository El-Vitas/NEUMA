import { Injectable } from '@nestjs/common';
import { and, PageLifecycle } from '@neuma/db';
import { parseSchemaPropertyValues } from '../../../../common/infrastructure/persistence/schema-json.adapter';
import { buildSpaceVisibilityFilter } from '../../../../common/infrastructure/persistence/space.visibility.filter';
import { buildTokenScopeWhere } from '../../../../common/infrastructure/persistence/token-scope.filter';
import type { FilterCondition, ModelFilterScope } from '../../../../common/types/model.filter.types';
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
const readableBy = (reader: PageOutlineReader) => {
  const isVisibleSpace = buildSpaceVisibilityFilter(reader.userId, reader.role);
  const isInTokenScope = reader.tokenScope === undefined ? null : buildTokenScopeWhere(reader.tokenScope);
  return (page: ModelFilterScope<'Page'>): FilterCondition =>
    and(
      ...(isInTokenScope === null ? [] : [isInTokenScope(page)]),
      page.lifecycle.eq(PageLifecycle.ACTIVE),
      page.space.some((space) => and(isVisibleSpace(space), space.workspaceId.eq(reader.workspaceId))),
    );
};

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
    const isReadable = readableBy(reader);
    const readableChildren = this.prisma.models.Page.where(isReadable).where({ parentId, spaceId });
    const [pages, aggregate] = await Promise.all([
      readableChildren
        .select('id', 'propertyValues', 'title')
        .include('children', (children) => children.where(isReadable).count())
        .orderBy([(page) => page.order.asc(), (page) => page.id.asc()])
        .offset(window.skip)
        .limit(window.take)
        .all(),
      readableChildren.aggregate((aggregation) => ({ total: aggregation.count() })),
    ]);
    const collectionIds = await this.findCollectionIds(pages.map((page) => page.id));
    const entries = pages.map((page) => ({
      childCount: page.children,
      id: page.id,
      isCollection: collectionIds.has(page.id),
      propertyValues: parseSchemaPropertyValues(page.propertyValues),
      title: page.title,
    }));
    return { entries, total: aggregate.total };
  }

  async listAncestors(pageId: string, reader: PageOutlineReader): Promise<readonly PageAncestor[]> {
    const page = await this.prisma.models.Page.select('id').where(readableBy(reader)).where({ id: pageId }).first();
    if (page === null) return [];
    const { columns } = this.prisma.tables.Page;
    const rows: readonly PageAncestorRow[] = await this.prisma.runner.query(
      this.prisma.sql`
      WITH RECURSIVE "chain" AS (
        SELECT "id", "parentId", "title", 0 AS "depth" FROM "Page" WHERE "id" = ${pageId}
        UNION ALL
        SELECT "ancestor"."id", "ancestor"."parentId", "ancestor"."title", "chain"."depth" + 1
        FROM "Page" AS "ancestor"
        INNER JOIN "chain" ON "ancestor"."id" = "chain"."parentId"
        WHERE "chain"."depth" < ${PAGE_OUTLINE_MAX_DEPTH}
      )
      SELECT "id", "title" FROM "chain" WHERE "depth" > 0 ORDER BY "depth" DESC
    `
        .returnsRow({ id: columns.id, title: columns.title })
        .build(),
    );
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
    return this.prisma.models.Page.select('id', 'spaceId', 'title')
      .where(readableBy(reader))
      .where((page) => page.id.in([...pageIds]))
      .all();
  }

  private async findCollectionIds(pageIds: readonly string[]): Promise<ReadonlySet<string>> {
    if (pageIds.length === 0) return new Set();
    const properties = await this.prisma.models.PageSchemaProperty.select('pageId')
      .where((property) => property.pageId.in([...pageIds]))
      .all();
    return new Set(properties.map((property) => property.pageId));
  }
}
