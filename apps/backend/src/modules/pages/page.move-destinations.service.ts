import { Inject, Injectable } from '@nestjs/common';
import { Result, USER_ROLE } from '@neuma/shared';
import { SEARCH_READER } from '../../common/constants/search.constants';
import type { SearchReader } from '../../common/types/search.types';
import {
  PAGE_MOVE_DESTINATIONS_PER_SPACE,
  PAGE_MOVE_DESTINATIONS_SEARCH_LIMIT,
  PAGE_REPOSITORY,
} from './constants/pages.constants';
import { PageAccessDeniedError } from './domain/page.error';
import { PageTreeService } from './page-tree.service';
import type { PageMoveCandidate, PageMoveDestinations, PageRepositoryContract } from './types/page.types';
import type { PageOutlineReader } from './types/page-outline.types';

/**
 * Where a page can be moved to, without listing a space: the top of each space while nothing is typed, and what a
 * search finds once it is. Neither offers the page itself or anything under it.
 */
@Injectable()
export class PageMoveDestinationsService {
  constructor(
    @Inject(PAGE_REPOSITORY) private readonly pageRepository: PageRepositoryContract,
    private readonly treeService: PageTreeService,
    @Inject(SEARCH_READER) private readonly searchReader: SearchReader,
  ) {}

  async list(
    pageId: string,
    query: string,
    reader: PageOutlineReader,
  ): Promise<Result<PageMoveDestinations, PageAccessDeniedError>> {
    if (reader.role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const origin = await this.pageRepository.readMoveOrigin(pageId, reader.workspaceId, reader.userId, reader.role);
    if (origin === null) return Result.fail(new PageAccessDeniedError());
    const { spaces } = origin;
    const pages =
      query === ''
        ? await this.listTopOfSpaces(pageId, spaces, reader)
        : await this.search(pageId, query, new Set(spaces.map((space) => space.id)), reader);
    return Result.ok({ pages, parentTitle: await this.readParentTitle(origin.parentId, reader), spaces });
  }

  private async readParentTitle(parentId: string | null, reader: PageOutlineReader): Promise<string | null> {
    if (parentId === null) return null;
    const [parent] = await this.treeService.lookup([parentId], reader);
    return parent?.title ?? null;
  }

  private async listTopOfSpaces(
    pageId: string,
    spaces: PageMoveDestinations['spaces'],
    reader: PageOutlineReader,
  ): Promise<PageMoveCandidate[]> {
    const tops = await Promise.all(
      spaces.map((space) =>
        this.treeService.listChildren(space.id, null, reader, { skip: 0, take: PAGE_MOVE_DESTINATIONS_PER_SPACE + 1 }),
      ),
    );
    return tops.flatMap((top, index) =>
      top.entries
        .filter((entry) => entry.id !== pageId)
        .slice(0, PAGE_MOVE_DESTINATIONS_PER_SPACE)
        .map((entry) => ({ id: entry.id, spaceId: spaces[index]?.id ?? '', title: entry.title })),
    );
  }

  private async search(
    pageId: string,
    query: string,
    spaceIds: ReadonlySet<string>,
    reader: PageOutlineReader,
  ): Promise<PageMoveCandidate[]> {
    const found = await this.searchReader.search({
      excludedBranchPageId: pageId,
      limit: PAGE_MOVE_DESTINATIONS_SEARCH_LIMIT,
      query,
      userId: reader.userId,
      userRole: reader.role,
      workspaceId: reader.workspaceId,
    });
    return found.items
      .filter((item) => spaceIds.has(item.spaceId))
      .map((item) => ({ id: item.sourceId, spaceId: item.spaceId, title: item.title }));
  }
}
