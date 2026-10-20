import { Injectable } from '@nestjs/common';
import { BlockAccessRepository } from '../../../../common/infrastructure/persistence/block-access.repository';
import type { BlockAccessViewer, ReadablePage } from '../../../../common/types/block-access.types';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  BACKLINKS_LIST_LIMIT,
  EMPTY_LINKS_RESULT,
  LINK_KIND_MENTION,
  LINKS_SCAN_LIMIT,
} from '../../constants/links.constants';
import {
  keepAllowedPageIds,
  listCandidateIds,
  listLinkedTargetIds,
  listRescuedPageIds,
  splitBacklinkCandidates,
} from '../../domain/block-link.domain';
import type { BacklinkCandidate, StoredLinkEnds } from '../../domain/block-link.domain.types';
import type { BacklinksResult, LinkedPage, LinkRepositoryContract, OutgoingLinksResult } from '../../types/links.types';

const pickPages = (pageIds: readonly string[], pages: readonly ReadablePage[]): readonly LinkedPage[] => {
  const pageById = new Map(pages.map((page) => [page.id, page]));
  return pageIds.flatMap((pageId) => {
    const page = pageById.get(pageId);
    return page === undefined ? [] : [{ id: page.id, spaceId: page.spaceId, title: page.title }];
  });
};

/** Reads the links a transaction reconciled; what the viewer may not read is dropped before it is counted. */
@Injectable()
export class BlockLinkRepository implements LinkRepositoryContract {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockAccess: BlockAccessRepository,
  ) {}

  async listBacklinks(targetPageId: string, viewer: BlockAccessViewer): Promise<BacklinksResult> {
    const readableTarget = await this.blockAccess.findReadableBlockIds([targetPageId], viewer);
    if (!readableTarget.has(targetPageId)) return EMPTY_LINKS_RESULT;
    const candidates = await this.listMentioningPages(targetPageId);
    const readableIds = await this.blockAccess.findReadableBlockIds(listCandidateIds(candidates), viewer);
    const { confirmedPageIds, pendingPageIds } = splitBacklinkCandidates(candidates, readableIds);
    const rescuedPageIds = await this.findPagesWithOtherReadableMention(targetPageId, pendingPageIds, viewer);
    const sourcePageIds = keepAllowedPageIds(candidates, new Set([...confirmedPageIds, ...rescuedPageIds]));
    const listed = sourcePageIds.slice(0, BACKLINKS_LIST_LIMIT);
    const pages = await this.blockAccess.findReadablePages(listed, viewer);
    return { count: sourcePageIds.length, items: pickPages(listed, pages) };
  }

  async listOutgoingLinks(sourcePageId: string, viewer: BlockAccessViewer): Promise<OutgoingLinksResult> {
    const readableSource = await this.blockAccess.findReadableBlockIds([sourcePageId], viewer);
    if (!readableSource.has(sourcePageId)) return EMPTY_LINKS_RESULT;
    const links: readonly StoredLinkEnds[] = await this.prisma.models.BlockLink.where({
      kind: LINK_KIND_MENTION,
      sourcePageId,
    })
      .select('sourceBlockId', 'sourcePageId', 'targetBlockId')
      .orderBy((link) => link.createdAt.asc())
      .limit(LINKS_SCAN_LIMIT)
      .all();
    const readableSources = await this.blockAccess.findReadableBlockIds(
      links.map((link) => link.sourceBlockId),
      viewer,
    );
    const targetIds = listLinkedTargetIds(links, sourcePageId, readableSources);
    const readableTargets = await this.blockAccess.findReadablePages(targetIds, viewer);
    const items = pickPages(targetIds, readableTargets);
    return { count: items.length, items: items.slice(0, BACKLINKS_LIST_LIMIT) };
  }

  /** One row per page that mentions the target, with its earliest mention, oldest page first. */
  private async listMentioningPages(targetPageId: string): Promise<readonly BacklinkCandidate[]> {
    const { columns } = this.prisma.tables.BlockLink;
    return this.prisma.runner.query(
      this.prisma.sql`
      SELECT "sourcePageId", "sourceBlockId"
      FROM (
        SELECT DISTINCT ON ("sourcePageId") "sourcePageId", "sourceBlockId", "createdAt"
        FROM "BlockLink"
        WHERE "targetBlockId" = ${targetPageId} AND "kind" = ${LINK_KIND_MENTION} AND "sourcePageId" <> ${targetPageId}
        ORDER BY "sourcePageId", "createdAt" ASC, "id" ASC
      ) AS "first"
      ORDER BY "createdAt" ASC, "sourcePageId" ASC
    `
        .returnsRow({ sourceBlockId: columns.sourceBlockId, sourcePageId: columns.sourcePageId })
        .build(),
    );
  }

  /** Only for pages whose first mention sits in a block the viewer cannot read: their other mentions decide. */
  private async findPagesWithOtherReadableMention(
    targetPageId: string,
    pendingPageIds: readonly string[],
    viewer: BlockAccessViewer,
  ): Promise<readonly string[]> {
    if (pendingPageIds.length === 0) return [];
    const links = await this.prisma.models.BlockLink.where({ kind: LINK_KIND_MENTION, targetBlockId: targetPageId })
      .where((link) => link.sourcePageId.in([...pendingPageIds]))
      .select('sourceBlockId', 'sourcePageId', 'targetBlockId')
      .all();
    const readableIds = await this.blockAccess.findReadableBlockIds(
      links.map((link) => link.sourceBlockId),
      viewer,
    );
    return listRescuedPageIds(links, readableIds);
  }
}
