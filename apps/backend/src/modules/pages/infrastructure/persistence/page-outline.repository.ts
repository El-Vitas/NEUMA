import { Injectable } from '@nestjs/common';
import { readBlockTitle } from '../../../../common/domain/block-access.domain';
import { PrismaService } from '../../../../prisma/prisma.service';
import { readPageValues } from '../../domain/page.block.domain';
import { isPageInTokenScope } from '../../domain/page.token-scope.domain';
import type { PageViewer } from '../../types/page.block.types';
import type { StoredPageBlock } from '../../types/page.types';
import type {
  PageAncestor,
  PageOutlineChildren,
  PageOutlinePlace,
  PageOutlineReader,
  PageOutlineRepositoryContract,
  PageOutlineWindow,
} from '../../types/page-outline.types';
import { PageBlockReader } from './page.block.reader';

const toViewer = (reader: PageOutlineReader): PageViewer => ({
  role: reader.role,
  userId: reader.userId,
  workspaceId: reader.workspaceId,
});

const compareByCreation = (first: StoredPageBlock, second: StoredPageBlock): number =>
  first.createdAt.getTime() - second.createdAt.getTime() || first.id.localeCompare(second.id);

/** Page tree without content, so walking a space stays cheap. Children the reader cannot see are not counted either. */
@Injectable()
export class PageOutlineRepository implements PageOutlineRepositoryContract {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockReader: PageBlockReader,
  ) {}

  async listChildren(
    spaceId: string,
    parentId: string | null,
    reader: PageOutlineReader,
    window: PageOutlineWindow,
  ): Promise<PageOutlineChildren> {
    const candidates = await this.blockReader.readChildPageBlocks(spaceId, parentId);
    const ordered = await this.sortSiblings(candidates, spaceId, parentId);
    const readable = await this.keepReadable(ordered, reader);
    const shown = readable.slice(window.skip, window.skip + window.take);
    const [childCounts, collectionIds] = await Promise.all([
      this.countReadableChildren(
        shown.map((page) => page.id),
        reader,
      ),
      this.findCollectionIds(shown.map((page) => page.id)),
    ]);
    const entries = shown.map((page) => ({
      childCount: childCounts.get(page.id) ?? 0,
      id: page.id,
      isCollection: collectionIds.has(page.id),
      propertyValues: readPageValues(page.properties),
      title: readBlockTitle(page.properties),
    }));
    return { entries, total: readable.length };
  }

  async listAncestors(pageId: string, reader: PageOutlineReader): Promise<readonly PageAncestor[]> {
    const [page] = await this.keepReadable(await this.blockReader.readPageBlocks([pageId]), reader);
    if (page === undefined) return [];
    const chains = await this.blockReader.readAncestry([pageId]);
    const ancestorIds = (chains.get(pageId) ?? []).slice(1).map((link) => link.id);
    const ancestors = await this.blockReader.readPageBlocks(ancestorIds);
    const readableIds = new Set((await this.keepReadable(ancestors, reader)).map((ancestor) => ancestor.id));
    const titles = new Map(ancestors.map((ancestor) => [ancestor.id, readBlockTitle(ancestor.properties)]));
    return ancestorIds
      .toReversed()
      .map(
        (id): PageAncestor =>
          readableIds.has(id)
            ? { id, isReadable: true, title: titles.get(id) ?? '' }
            : { id: null, isReadable: false, title: null },
      );
  }

  async listReadable(pageIds: readonly string[], reader: PageOutlineReader): Promise<readonly PageOutlinePlace[]> {
    const readable = await this.keepReadable(await this.blockReader.readPageBlocks(pageIds), reader);
    return readable.map(
      (page): PageOutlinePlace => ({
        id: page.id,
        spaceId: page.spaceId,
        title: readBlockTitle(page.properties),
      }),
    );
  }

  /** The pages of a page in the order it lists them; the ones at the top of a space, by when they were created. */
  private async sortSiblings(
    siblings: readonly StoredPageBlock[],
    spaceId: string,
    parentId: null | string,
  ): Promise<StoredPageBlock[]> {
    const listed = await this.blockReader.readSiblingIds(spaceId, parentId);
    const positions = new Map(listed.map((id, position) => [id, position]));
    const positionOf = (page: StoredPageBlock): number => positions.get(page.id) ?? positions.size;
    return siblings.toSorted(
      (first, second) => positionOf(first) - positionOf(second) || compareByCreation(first, second),
    );
  }

  /** Active pages the reader can see, narrowed to the token scope when there is one. */
  private async keepReadable(
    blocks: readonly StoredPageBlock[],
    reader: PageOutlineReader,
  ): Promise<StoredPageBlock[]> {
    const accessible = await this.blockReader.keepAccessible(blocks, toViewer(reader));
    return accessible
      .filter(({ access }) => !access.isInTrash)
      .map(({ block }) => block)
      .filter((block) => isPageInTokenScope(block, reader.tokenScope));
  }

  private async countReadableChildren(
    parentIds: readonly string[],
    reader: PageOutlineReader,
  ): Promise<ReadonlyMap<string, number>> {
    const children = await this.keepReadable(await this.blockReader.readPagesUnder(parentIds), reader);
    const counts = new Map<string, number>();
    for (const child of children) {
      if (child.parentId !== null) counts.set(child.parentId, (counts.get(child.parentId) ?? 0) + 1);
    }
    return counts;
  }

  private async findCollectionIds(pageIds: readonly string[]): Promise<ReadonlySet<string>> {
    if (pageIds.length === 0) return new Set();
    const properties = await this.prisma.models.PageSchemaProperty.select('pageId')
      .where((property) => property.pageId.in([...pageIds]))
      .all();
    return new Set(properties.map((property) => property.pageId));
  }
}
