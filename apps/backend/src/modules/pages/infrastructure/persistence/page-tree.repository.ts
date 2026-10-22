import { Injectable } from '@nestjs/common';
import { PageLifecycle } from '@neuma/db';
import { isPageTemplate } from '@neuma/shared';
import { readBlockTitle } from '../../../../common/domain/block-access.domain';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  PAGE_RECENT_BLOCKS_PER_PAGE,
  PAGE_RECENT_MAX_ROUNDS,
  PAGE_TREE_EMPTY_CHILDREN,
} from '../../constants/pages.constants';
import { readPageIcon } from '../../domain/page.block.domain';
import { orderBySiblingPosition } from '../../domain/page.sibling-order.domain';
import type { AccessiblePage, PageViewer, RecentlyEditedPage } from '../../types/page.block.types';
import type { StoredPageBlock } from '../../types/page.types';
import type { PageOutlineReader, PageOutlineWindow } from '../../types/page-outline.types';
import type {
  PageLookupContent,
  PageLookupEntry,
  PageRecentEntry,
  PageTreeAncestor,
  PageTreeChildren,
  PageTreeEntry,
  PageTreeFacts,
  PageTreeLevel,
  PageTreePath,
  PageTreeRepositoryContract,
} from '../../types/page-tree.types';
import { PageBlockReader } from './page.block.reader';
import { PageSummaryReader } from './page.summary.reader';

const toViewer = (reader: PageOutlineReader): PageViewer => ({
  role: reader.role,
  userId: reader.userId,
  workspaceId: reader.workspaceId,
});

const toLifecycle = (isTrashed: boolean): 'ACTIVE' | 'TRASHED' => (isTrashed ? 'TRASHED' : 'ACTIVE');

const isTrashedPage = ({ access, block }: AccessiblePage): boolean =>
  access.isInTrash || block.lifecycle === PageLifecycle.TRASHED;

const toTreeEntry = (
  block: StoredPageBlock,
  order: number,
  facts: PageTreeFacts,
  isTrashed: boolean,
): PageTreeEntry => ({
  hasChildren: !isTrashed && facts.parentsWithChildren.has(block.id),
  hasOwnPermissions: block.permissions !== null,
  icon: readPageIcon(block.format),
  id: block.id,
  isCollection: facts.collectionIds.has(block.id),
  lifecycle: toLifecycle(isTrashed),
  order,
  parentId: block.parentId,
  title: readBlockTitle(block.properties),
  version: block.version,
});

const toAncestor = (link: AccessiblePage | null): PageTreeAncestor =>
  link === null
    ? { icon: null, id: null, isReadable: false, lifecycle: null, title: null }
    : {
        icon: readPageIcon(link.block.format),
        id: link.block.id,
        isReadable: true,
        lifecycle: toLifecycle(isTrashedPage(link)),
        title: readBlockTitle(link.block.properties),
      };

/** From the topmost ancestor down, the ones the reader can open before the first one they cannot. */
const takeReadablePrefix = (links: readonly (AccessiblePage | null)[]): AccessiblePage[] => {
  const firstClosed = links.indexOf(null);
  const prefix = firstClosed === -1 ? links : links.slice(0, firstClosed);
  return prefix.filter((link): link is AccessiblePage => link !== null);
};

const windowStartFor = (ids: readonly string[], focusId: string, windowSize: number): number => {
  const position = ids.indexOf(focusId);
  return position === -1 ? 0 : Math.floor(position / windowSize) * windowSize;
};

/**
 * The page tree a sidebar draws, one parent at a time and without content (ADR 030). A page with no permissions of
 * its own is as readable as the pages beside it, so one of them stands for all and only the ones that declare
 * their own rule are judged one by one.
 */
@Injectable()
export class PageTreeRepository implements PageTreeRepositoryContract {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockReader: PageBlockReader,
    private readonly summaryReader: PageSummaryReader,
  ) {}

  async listChildren(
    spaceId: string,
    parentId: string | null,
    reader: PageOutlineReader,
    window: PageOutlineWindow,
  ): Promise<PageTreeChildren> {
    if (parentId !== null && (await this.findCollectionIds([parentId])).has(parentId)) return PAGE_TREE_EMPTY_CHILDREN;
    const viewer = toViewer(reader);
    const readable = await this.readOrderedReadable(spaceId, parentId, viewer);
    return { entries: await this.describeWindow(readable, window, viewer), total: readable.length };
  }

  async readPath(pageId: string, reader: PageOutlineReader, windowSize: number): Promise<PageTreePath | null> {
    const viewer = toViewer(reader);
    const target = await this.findReadable(pageId, viewer);
    if (target === null) return null;
    const links = await this.readAncestorLinks(pageId, viewer);
    const readableLinks = takeReadablePrefix(links);
    const levels = await this.readLevels(target, readableLinks, links.length, windowSize, viewer);
    const page = await this.describePage(target, levels, viewer);
    return { ancestors: links.map(toAncestor), levels, page };
  }

  async listAncestors(pageId: string, reader: PageOutlineReader): Promise<readonly PageTreeAncestor[] | null> {
    const viewer = toViewer(reader);
    if ((await this.findReadable(pageId, viewer)) === null) return null;
    return (await this.readAncestorLinks(pageId, viewer)).map(toAncestor);
  }

  async lookup(pageIds: readonly string[], reader: PageOutlineReader): Promise<readonly PageLookupEntry[]> {
    const blocks = (await this.blockReader.readPageBlocks(pageIds)).filter(
      (block) => !isPageTemplate(block.properties),
    );
    const accessible = await this.blockReader.keepAccessible(blocks, toViewer(reader));
    return accessible.map((page) => ({
      icon: readPageIcon(page.block.format),
      id: page.block.id,
      lifecycle: toLifecycle(isTrashedPage(page)),
      spaceId: page.block.spaceId,
      title: readBlockTitle(page.block.properties),
      version: page.block.version,
    }));
  }

  async lookupContent(pageIds: readonly string[], reader: PageOutlineReader): Promise<readonly PageLookupContent[]> {
    const blocks = (await this.blockReader.readPageBlocks(pageIds)).filter(
      (block) => !isPageTemplate(block.properties),
    );
    const accessible = await this.blockReader.keepAccessible(blocks, toViewer(reader));
    const summaries = await this.summaryReader.summarizeAll(accessible.filter((page) => !isTrashedPage(page)));
    return summaries.flatMap(({ content, id, spaceId, title }) =>
      content === null ? [] : [{ content, id, spaceId, title }],
    );
  }

  async listRecent(spaceId: string, reader: PageOutlineReader, take: number): Promise<readonly PageRecentEntry[]> {
    const viewer = toViewer(reader);
    let blockLimit = take * PAGE_RECENT_BLOCKS_PER_PAGE;
    let recent: PageRecentEntry[] = [];
    for (let round = 0; round < PAGE_RECENT_MAX_ROUNDS && recent.length < take; round += 1) {
      const edited = await this.blockReader.readRecentlyEditedPages(spaceId, blockLimit);
      recent = await this.keepReadableRecent(edited, viewer);
      blockLimit *= PAGE_RECENT_BLOCKS_PER_PAGE;
    }
    return recent.slice(0, take);
  }

  private async keepReadableRecent(
    edited: readonly RecentlyEditedPage[],
    viewer: PageViewer,
  ): Promise<PageRecentEntry[]> {
    const blocks = (await this.blockReader.readPageBlocks(edited.map((page) => page.id))).filter(
      (block) => !isPageTemplate(block.properties),
    );
    const readable = new Map(
      (await this.blockReader.keepAccessible(blocks, viewer))
        .filter((page) => !isTrashedPage(page))
        .map((page) => [page.block.id, page.block]),
    );
    const editors = await this.blockReader.readUsers(
      edited.filter(({ id }) => readable.has(id)).map((page) => page.editedById),
    );
    return edited.flatMap(({ editedAt, editedById, id }) => {
      const block = readable.get(id);
      if (block === undefined) return [];
      return [
        {
          icon: readPageIcon(block.format),
          id,
          title: readBlockTitle(block.properties),
          updatedAt: editedAt,
          updatedByName: editors.get(editedById)?.name ?? null,
        },
      ];
    });
  }

  private async findReadable(pageId: string, viewer: PageViewer): Promise<AccessiblePage | null> {
    const [page] = await this.blockReader.keepAccessible(await this.blockReader.readPageBlocks([pageId]), viewer);
    return page ?? null;
  }

  /** Topmost first; null stands for an ancestor the reader cannot open. */
  private async readAncestorLinks(pageId: string, viewer: PageViewer): Promise<(AccessiblePage | null)[]> {
    const chains = await this.blockReader.readAncestry([pageId]);
    const ancestorIds = (chains.get(pageId) ?? []).slice(1).map((link) => link.id);
    const accessible = await this.blockReader.keepAccessible(
      await this.blockReader.readPageBlocks(ancestorIds),
      viewer,
    );
    const byId = new Map(accessible.map((page) => [page.block.id, page]));
    return ancestorIds.toReversed().map((id) => byId.get(id) ?? null);
  }

  private async readLevels(
    target: AccessiblePage,
    readableLinks: readonly AccessiblePage[],
    ancestorCount: number,
    windowSize: number,
    viewer: PageViewer,
  ): Promise<PageTreeLevel[]> {
    const isWholeChainReadable = readableLinks.length === ancestorCount;
    const focusIds = [
      ...readableLinks.map((link) => link.block.id),
      ...(isWholeChainReadable ? [target.block.id] : []),
    ];
    const parentIds = [null, ...readableLinks.map((link) => link.block.id)].slice(0, focusIds.length);
    const collectionIds = await this.findCollectionIds(
      parentIds.flatMap((parentId) => (parentId === null ? [] : [parentId])),
    );
    const levels: PageTreeLevel[] = [];
    for (const [index, parentId] of parentIds.entries()) {
      if (parentId !== null && collectionIds.has(parentId)) break;
      levels.push(await this.readLevel(target.block.spaceId, parentId, focusIds[index] ?? '', windowSize, viewer));
    }
    return levels;
  }

  private async readLevel(
    spaceId: string,
    parentId: string | null,
    focusId: string,
    windowSize: number,
    viewer: PageViewer,
  ): Promise<PageTreeLevel> {
    const readable = await this.readOrderedReadable(spaceId, parentId, viewer);
    const skip = windowStartFor(
      readable.map((block) => block.id),
      focusId,
      windowSize,
    );
    const entries = await this.describeWindow(readable, { skip, take: windowSize }, viewer);
    return { entries, parentId, skip, total: readable.length };
  }

  private async describePage(
    target: AccessiblePage,
    levels: readonly PageTreeLevel[],
    viewer: PageViewer,
  ): Promise<PageTreeEntry> {
    const listed = levels.flatMap((level) => level.entries).find((entry) => entry.id === target.block.id);
    if (listed !== undefined) return listed;
    const facts = await this.readFacts([target.block], viewer);
    return toTreeEntry(target.block, 0, facts, isTrashedPage(target));
  }

  private async describeWindow(
    readable: readonly StoredPageBlock[],
    window: PageOutlineWindow,
    viewer: PageViewer,
  ): Promise<PageTreeEntry[]> {
    const shown = readable.slice(window.skip, window.skip + window.take);
    const facts = await this.readFacts(shown, viewer);
    return shown.map((block, index) => toTreeEntry(block, window.skip + index, facts, false));
  }

  private async readFacts(blocks: readonly StoredPageBlock[], viewer: PageViewer): Promise<PageTreeFacts> {
    const ids = blocks.map((block) => block.id);
    const collectionIds = await this.findCollectionIds(ids);
    const parentsWithChildren = await this.blockReader.findParentsWithReadableChildren(
      ids.filter((id) => !collectionIds.has(id)),
      viewer,
    );
    return { collectionIds, parentsWithChildren };
  }

  private async readOrderedReadable(
    spaceId: string,
    parentId: string | null,
    viewer: PageViewer,
  ): Promise<StoredPageBlock[]> {
    const candidates = await this.blockReader.readChildPageBlocks(spaceId, parentId);
    const ordered = orderBySiblingPosition(candidates, await this.blockReader.readSiblingIds(spaceId, parentId));
    return this.keepReadableSiblings(ordered, viewer);
  }

  /** Siblings that follow their parent's rule stand or fall together; the ones with their own rule are judged apart. */
  private async keepReadableSiblings(
    siblings: readonly StoredPageBlock[],
    viewer: PageViewer,
  ): Promise<StoredPageBlock[]> {
    const active = siblings.filter((block) => block.lifecycle === PageLifecycle.ACTIVE);
    const [followers, declarers] = [
      active.filter((block) => block.permissions === null),
      active.filter((block) => block.permissions !== null),
    ];
    const [followersReadable, declarersReadable] = await Promise.all([
      this.isAnyReadable(followers.slice(0, 1), viewer),
      this.blockReader.keepAccessible(declarers, viewer),
    ]);
    const readableDeclarers = new Set(
      declarersReadable.filter((page) => !page.access.isInTrash).map((page) => page.block.id),
    );
    return active.filter((block) => (block.permissions === null ? followersReadable : readableDeclarers.has(block.id)));
  }

  private async isAnyReadable(blocks: readonly StoredPageBlock[], viewer: PageViewer): Promise<boolean> {
    const accessible = await this.blockReader.keepAccessible(blocks, viewer);
    return accessible.some((page) => !page.access.isInTrash);
  }

  private async findCollectionIds(pageIds: readonly string[]): Promise<ReadonlySet<string>> {
    if (pageIds.length === 0) return new Set();
    const properties = await this.prisma.models.PageSchemaProperty.select('pageId')
      .where((property) => property.pageId.in([...pageIds]))
      .all();
    return new Set(properties.map((property) => property.pageId));
  }
}
