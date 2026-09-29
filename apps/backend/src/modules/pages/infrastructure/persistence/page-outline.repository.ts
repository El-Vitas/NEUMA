import { PageLifecycle } from '@company-brain/db';
import type { Prisma } from '@company-brain/db/generated';
import { Injectable } from '@nestjs/common';
import { buildSpaceVisibilityFilter } from '../../../../common/infrastructure/persistence/space.visibility.filter';
import { buildTokenScopeWhere } from '../../../../common/infrastructure/persistence/token-scope.filter';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PAGE_OUTLINE_MAX_DEPTH } from '../../constants/pages.constants';
import type {
  PageAncestor,
  PageAncestorRow,
  PageOutlineEntry,
  PageOutlinePlace,
  PageOutlineReader,
  PageOutlineRepositoryContract,
} from '../../types/page-outline.types';

/** Las páginas activas que quien mira puede ver: las de sus espacios, y con un token, solo las que el token deja. */
const readableBy = (reader: PageOutlineReader): Prisma.PageWhereInput => ({
  ...(reader.tokenScope === undefined ? {} : buildTokenScopeWhere(reader.tokenScope)),
  lifecycle: PageLifecycle.ACTIVE,
  space: { ...buildSpaceVisibilityFilter(reader.userId, reader.role), workspaceId: reader.workspaceId },
});

/**
 * El árbol de páginas leído sin su contenido.
 *
 * Recorrer un espacio no necesita lo que dice cada página, y cargarlo haría
 * pesado algo que un agente hace a cada paso. Ve lo mismo que ve la persona, y
 * con un token, lo que el token deja: una hija que no se puede ver tampoco se
 * cuenta, porque contarla ya diría que existe.
 */
@Injectable()
export class PageOutlineRepository implements PageOutlineRepositoryContract {
  constructor(private readonly prisma: PrismaService) {}

  async listChildren(
    spaceId: string,
    parentId: string | null,
    reader: PageOutlineReader,
  ): Promise<readonly PageOutlineEntry[]> {
    const pages = await this.prisma.page.findMany({
      orderBy: { order: 'asc' },
      select: {
        _count: { select: { children: { where: readableBy(reader) }, schemaProperties: true } },
        id: true,
        title: true,
      },
      where: { ...readableBy(reader), parentId, spaceId },
    });
    return pages.map((page) => ({
      childCount: page._count.children,
      id: page.id,
      isCollection: page._count.schemaProperties > 0,
      title: page.title,
    }));
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
    return rows.map((row) => ({ id: row.id, isReadable: readable.has(row.id), title: row.title }));
  }

  async listReadable(pageIds: readonly string[], reader: PageOutlineReader): Promise<readonly PageOutlinePlace[]> {
    if (pageIds.length === 0) return [];
    return this.prisma.page.findMany({
      select: { id: true, spaceId: true },
      where: { ...readableBy(reader), id: { in: [...pageIds] } },
    });
  }
}
