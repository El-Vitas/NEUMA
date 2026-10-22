import { Injectable } from '@nestjs/common';
import { and, PageLifecycle } from '@neuma/db';
import {
  BLOCK_TYPE,
  isPageTemplate,
  type PageContent,
  type PageCoverValue,
  type PageIcon,
  type Result,
  readPageTemplate,
  type UserRole,
} from '@neuma/shared';
import { readBlockTitle } from '../../../../common/domain/block-access.domain';
import { buildSpaceVisibilityFilter } from '../../../../common/infrastructure/persistence/space.visibility.filter';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PAGE_RESTORE_VERSION_OUTCOME } from '../../constants/pages.constants';
import { readPageValues } from '../../domain/page.block.domain';
import { collectDescendantIds, pageTitleMatchesSearch } from '../../domain/page.domain';
import { dropHiddenBlocks, listClosedBlockIds, listNodeIds } from '../../domain/page.visibility.domain';
import type { AccessiblePage, PageViewer } from '../../types/page.block.types';
import type {
  DuplicatePageInput,
  NewPageInput,
  PageContentRewrite,
  PageContentWriter,
  PageDeleteForeverOutcome,
  PageMoveContext,
  PageMoveDestinations,
  PagePropertyValuesMerge,
  PageRepositoryContract,
  PageRestoreOutcome,
  PageRestoreVersionOutcome,
  PageSummary,
  PageVersionListing,
  PageVersionSnapshot,
  TrashedPageSummary,
  UpdatePagePropertyValuesInput,
} from '../../types/page.types';
import type { PageRowTemplate } from '../../types/page-template.types';
import { PageBlockReader } from './page.block.reader';
import { PageBlockWriter } from './page.block.writer';
import { PagePurgeRepository } from './page.purge.repository';
import { PageSummaryReader } from './page.summary.reader';
import { PageTemplateRepository } from './page.template.repository';
import { PageVersionRepository } from './page.version.repository';

const toViewer = (workspaceId: string, userId: string, role: UserRole): PageViewer => ({ role, userId, workspaceId });

const compareBySiblingPosition = (first: PageSummary, second: PageSummary): number =>
  (first.parentId ?? '').localeCompare(second.parentId ?? '') || first.order - second.order;

/**
 * Pages as the blocks module stores them. What a page says is read from its block and the blocks below it; every
 * change is handed to the writer, which sends it to the blocks module as operations.
 */
@Injectable()
export class PageRepository implements PageRepositoryContract {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockReader: PageBlockReader,
    private readonly summaryReader: PageSummaryReader,
    private readonly blockWriter: PageBlockWriter,
    private readonly versionRepository: PageVersionRepository,
    private readonly purgeRepository: PagePurgeRepository,
    private readonly templateRepository: PageTemplateRepository,
  ) {}

  async listAccessible(
    spaceId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
    includeTrashed: boolean,
  ): Promise<readonly PageSummary[]> {
    const blocks = await this.blockReader.readSpacePageBlocks(spaceId);
    const accessible = await this.blockReader.keepAccessible(blocks, toViewer(workspaceId, userId, role));
    const listed = includeTrashed ? accessible : accessible.filter(({ access }) => !access.isInTrash);
    const summaries = await this.summaryReader.summarizeAll(listed);
    return summaries.toSorted(compareBySiblingPosition);
  }

  async listAccessibleAmong(
    spaceId: string,
    pageIds: readonly string[],
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<readonly PageSummary[]> {
    const blocks = (await this.blockReader.readPageBlocks(pageIds)).filter(
      (block) => block.spaceId === spaceId && !isPageTemplate(block.properties),
    );
    const accessible = await this.blockReader.keepAccessible(blocks, toViewer(workspaceId, userId, role));
    const summaries = await this.summaryReader.summarizeAll(accessible.filter(({ access }) => !access.isInTrash));
    return summaries.toSorted(compareBySiblingPosition);
  }

  async getAccessible(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<PageSummary | null> {
    const page = await this.findAccessiblePage(pageId, toViewer(workspaceId, userId, role));
    return page === null ? null : this.summaryReader.summarizeOne(page);
  }

  async findReadablePageIds(
    pageIds: readonly string[],
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<readonly string[]> {
    const blocks = await this.blockReader.readPageBlocks(pageIds);
    const accessible = await this.blockReader.keepAccessible(blocks, toViewer(workspaceId, userId, role));
    return accessible.filter(({ access }) => !access.isInTrash).map(({ block }) => block.id);
  }

  create(input: NewPageInput): Promise<PageSummary | null> {
    return this.blockWriter.create(input);
  }

  /** Null when no template applies; the default one of the collection when none is named. */
  async readRowTemplate(
    collectionId: string,
    templateId: null | string | undefined,
    viewer: PageViewer,
  ): Promise<PageRowTemplate | 'NOT_FOUND' | null> {
    if (templateId === null) return null;
    const template =
      templateId === undefined
        ? await this.findDefaultTemplate(collectionId, viewer)
        : await this.templateRepository.findTemplate(collectionId, templateId, viewer);
    if (template === null) return templateId === undefined ? null : 'NOT_FOUND';
    const summary = await this.summaryReader.summarizeOne(template);
    return {
      content: summary.content,
      propertyValues: readPageValues(template.block.properties) ?? {},
      title: summary.title,
      variables: readPageTemplate(template.block.properties)?.variables ?? {},
    };
  }

  duplicate(input: DuplicatePageInput): Promise<PageSummary | null> {
    return this.blockWriter.duplicate(input);
  }

  writeContent(writer: PageContentWriter, rewrite: PageContentRewrite): Promise<PageContent | null> {
    return this.blockWriter.writeContent(writer, rewrite);
  }

  /**
   * A version keeps the whole page as it was. What a viewer reads of it is cut by the permissions the page's blocks
   * have now: the nodes of a block closed to them are left out, with what is below.
   */
  async findVersion(
    pageId: string,
    version: number,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<PageVersionSnapshot | null> {
    const page = await this.findAccessiblePage(pageId, toViewer(workspaceId, userId, role));
    const snapshot = page === null ? null : await this.versionRepository.find(pageId, version);
    if (page === null || snapshot === null) return null;
    const visible = await this.blockReader.readVisibleContentBlocks([page]);
    const chains = await this.blockReader.readAncestry(listNodeIds(snapshot.content));
    const hiddenIds = new Set([...(visible.get(pageId)?.hiddenIds ?? []), ...listClosedBlockIds(chains, page.viewer)]);
    return { ...snapshot, content: dropHiddenBlocks(snapshot.content, hiddenIds) };
  }

  async listVersions(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
    cursor: null | number,
    limit: number,
  ): Promise<null | PageVersionListing> {
    const page = await this.findAccessiblePage(pageId, toViewer(workspaceId, userId, role));
    return page === null ? null : this.versionRepository.list(pageId, cursor, limit);
  }

  recordVersion(pageId: string, authorId: string): Promise<void> {
    return this.versionRepository.record(pageId, authorId);
  }

  async restoreVersion(
    pageId: string,
    version: number,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<PageRestoreVersionOutcome> {
    const snapshot = await this.findVersion(pageId, version, workspaceId, userId, role);
    if (snapshot === null) return PAGE_RESTORE_VERSION_OUTCOME.missing;
    const page = await this.blockWriter.restoreVersion(
      pageId,
      snapshot.content,
      snapshot.title,
      userId,
      workspaceId,
      role,
    );
    return page === null ? null : { page };
  }

  updatePropertyValues<TError>(
    input: UpdatePagePropertyValuesInput,
    merge: PagePropertyValuesMerge<TError>,
  ): Promise<Result<PageSummary, TError> | null> {
    return this.blockWriter.updatePropertyValues(input, merge);
  }

  rename(
    pageId: string,
    title: string,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<PageSummary | null> {
    return this.blockWriter.rename(pageId, title, userId, workspaceId, role);
  }

  setLocked(
    pageId: string,
    locked: boolean,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<PageSummary | null> {
    return this.blockWriter.setLocked(pageId, locked, userId, workspaceId, role);
  }

  setVerification(
    pageId: string,
    verified: boolean,
    expiresAt: Date | null,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<PageSummary | null> {
    return this.blockWriter.setVerification(pageId, verified, expiresAt, userId, workspaceId, role);
  }

  setDefaultTemplate(
    collectionId: string,
    templateId: null | string,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<PageSummary | null> {
    return this.blockWriter.setDefaultTemplate(collectionId, templateId, userId, workspaceId, role);
  }

  setOwner(
    pageId: string,
    ownerId: null | string,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<PageSummary | null> {
    return this.blockWriter.setOwner(pageId, ownerId, userId, workspaceId, role);
  }

  updateCover(
    pageId: string,
    cover: PageCoverValue | null,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<PageSummary | null> {
    return this.blockWriter.updateCover(pageId, cover, userId, workspaceId, role);
  }

  updateIcon(
    pageId: string,
    icon: PageIcon | null,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<PageSummary | null> {
    return this.blockWriter.updateIcon(pageId, icon, userId, workspaceId, role);
  }

  reorderAmongSiblings(
    pageId: string,
    beforePageId: null | string,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<readonly PageSummary[] | null> {
    return this.blockWriter.reorderAmongSiblings(pageId, beforePageId, userId, workspaceId, role);
  }

  move(
    pageId: string,
    parentId: null | string,
    targetSpaceId: string,
    userId: string,
    workspaceId: string,
    role: UserRole,
    mutationId: string,
  ): Promise<PageSummary | null> {
    return this.blockWriter.move(pageId, parentId, targetSpaceId, userId, workspaceId, role, mutationId);
  }

  trashCascade(
    pageId: string,
    userId: string,
    workspaceId: string,
    role: UserRole,
    mutationId: string,
  ): Promise<boolean> {
    return this.blockWriter.trashCascade(pageId, userId, workspaceId, role, mutationId);
  }

  restoreCascade(
    pageId: string,
    userId: string,
    workspaceId: string,
    role: UserRole,
    mutationId: string,
    includeChildren: boolean,
  ): Promise<null | PageRestoreOutcome> {
    return this.blockWriter.restoreCascade(pageId, userId, workspaceId, role, mutationId, includeChildren);
  }

  async parentBelongsToSpace(parentId: string, spaceId: string): Promise<boolean> {
    const parent = await this.prisma.models.Block.select('id')
      .where({ id: parentId, spaceId, type: BLOCK_TYPE.page })
      .first();
    return parent !== null;
  }

  /** The destination tree loads only if the reader can see that space. */
  async findMoveContext(
    pageId: string,
    targetSpaceId: null | string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<PageMoveContext | null> {
    const viewer = toViewer(workspaceId, userId, role);
    const page = await this.findAccessiblePage(pageId, viewer);
    if (page === null) return null;
    const spaceIds = targetSpaceId === null ? [page.block.spaceId] : [...new Set([page.block.spaceId, targetSpaceId])];
    const readableSpaceIds = await this.blockReader.readReadableSpaceIds(spaceIds, viewer);
    if (!spaceIds.every((spaceId) => readableSpaceIds.has(spaceId))) return null;
    const blocks = (await Promise.all(spaceIds.map((spaceId) => this.blockReader.readSpacePageBlocks(spaceId)))).flat();
    return {
      pageId: page.block.id,
      pages: blocks.map(({ id, parentId: blockParentId, spaceId }) => ({ id, parentId: blockParentId, spaceId })),
      propertyValues: readPageValues(page.block.properties),
      spaceId: page.block.spaceId,
      title: readBlockTitle(page.block.properties),
    };
  }

  /** The rows that keep values: the child pages of a collection. */
  async listWithProperties(workspaceId: string, userId: string, role: UserRole): Promise<readonly PageSummary[]> {
    const { columns } = this.prisma.tables.Block;
    const rows = await this.prisma.runner.query(
      this.prisma.sql`
      SELECT "block"."id"
      FROM "Block" AS "block"
      INNER JOIN "Space" AS "space" ON "space"."id" = "block"."spaceId"
      WHERE "block"."type" = ${BLOCK_TYPE.page} AND "block"."lifecycle"::text = ${PageLifecycle.ACTIVE}
        AND "block"."parentId" IS NOT NULL AND jsonb_typeof("block"."properties"->'values') = 'object'
        AND "space"."workspaceId" = ${workspaceId}
    `
        .returnsRow({ id: columns.id })
        .build(),
    );
    const blocks = await this.blockReader.readPageBlocks(rows.map((row) => row.id));
    const accessible = await this.blockReader.keepAccessible(blocks, toViewer(workspaceId, userId, role));
    const summaries = await this.summaryReader.summarizeAll(accessible.filter(({ access }) => !access.isInTrash));
    return summaries.toSorted((first, second) => second.updatedAt.getTime() - first.updatedAt.getTime());
  }

  async listMoveDestinations(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<PageMoveDestinations | null> {
    const viewer = toViewer(workspaceId, userId, role);
    const page = await this.findAccessiblePage(pageId, viewer);
    if (page === null) return null;
    const isVisible = buildSpaceVisibilityFilter(userId, role);
    const spaces = await this.prisma.models.Space.select('id', 'name')
      .where((space) => and(isVisible(space), space.workspaceId.eq(workspaceId)))
      .orderBy((space) => space.name.asc())
      .all();
    const blocks = (await Promise.all(spaces.map((space) => this.blockReader.readSpacePageBlocks(space.id)))).flat();
    const ownBranch = new Set([pageId, ...collectDescendantIds(pageId, blocks)]);
    const candidates = await this.blockReader.keepAccessible(
      blocks.filter((block) => block.lifecycle === PageLifecycle.ACTIVE && !ownBranch.has(block.id)),
      viewer,
    );
    return {
      pages: candidates
        .filter(({ access }) => !access.isInTrash)
        .map(({ block }) => ({ id: block.id, spaceId: block.spaceId, title: readBlockTitle(block.properties) }))
        .toSorted((first, second) => first.title.localeCompare(second.title)),
      spaces,
    };
  }

  async countDescendantsByLifecycle(
    pageId: string,
    lifecycle: PageLifecycle,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<null | number> {
    const page = await this.findAccessiblePage(pageId, toViewer(workspaceId, userId, role));
    if (page === null) return null;
    const hierarchy = await this.blockReader.readSpacePageBlocks(page.block.spaceId, { includeTemplates: true });
    const lifecycleById = new Map(hierarchy.map((entry) => [entry.id, entry.lifecycle]));
    return collectDescendantIds(pageId, hierarchy).filter((id) => lifecycleById.get(id) === lifecycle).length;
  }

  /** Only the pages that were trashed themselves: whatever sits below one went with it and is not listed again. */
  async listTrashed(
    workspaceId: string,
    userId: string,
    role: UserRole,
    spaceId: null | string,
    search: null | string,
  ): Promise<readonly TrashedPageSummary[]> {
    const viewer = toViewer(workspaceId, userId, role);
    const accessibleSpaceIds = await this.findAccessibleSpaceIds(viewer, spaceId);
    if (accessibleSpaceIds.length === 0) return [];
    const hierarchy = (
      await Promise.all(
        accessibleSpaceIds.map((accessibleId) =>
          this.blockReader.readSpacePageBlocks(accessibleId, { includeTemplates: true }),
        ),
      )
    ).flat();
    const trashed = hierarchy.filter((block) => block.lifecycle === PageLifecycle.TRASHED);
    const accessible = await this.blockReader.keepAccessible(trashed, viewer);
    const listed = accessible.filter(({ block }) => pageTitleMatchesSearch(readBlockTitle(block.properties), search));
    if (listed.length === 0) return [];
    const lifecycleById = new Map(hierarchy.map((block) => [block.id, block.lifecycle]));
    const deletedBy = await this.blockReader.readUsers(listed.map(({ block }) => block.editedById));
    return listed.map(({ block }) => this.toTrashedSummary(block, hierarchy, lifecycleById, deletedBy));
  }

  /** Schedules the deletion instead of deleting: the page stays restorable until `purgeAfter` (ADR 017). */
  async deleteForever(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
    purgeAfter: Date,
  ): Promise<PageDeleteForeverOutcome> {
    const page = await this.findAccessiblePage(pageId, toViewer(workspaceId, userId, role));
    if (page === null) return 'NOT_FOUND';
    if (page.block.lifecycle !== PageLifecycle.TRASHED) return 'NOT_TRASHED';
    await this.prisma.transaction((transaction) =>
      this.purgeRepository.schedule(transaction, { pageIds: [pageId], purgeAfter, requestedById: userId, workspaceId }),
    );
    return 'SCHEDULED';
  }

  /** Schedules every trashed page the caller can reach; returns the ones newly scheduled. */
  async emptyTrash(
    workspaceId: string,
    userId: string,
    role: UserRole,
    spaceId: null | string,
    purgeAfter: Date,
  ): Promise<readonly string[]> {
    const viewer = toViewer(workspaceId, userId, role);
    const accessibleSpaceIds = await this.findAccessibleSpaceIds(viewer, spaceId);
    if (accessibleSpaceIds.length === 0) return [];
    const pages = (
      await Promise.all(
        accessibleSpaceIds.map((accessibleId) =>
          this.blockReader.readSpacePageBlocks(accessibleId, { includeTemplates: true }),
        ),
      )
    ).flat();
    const accessible = await this.blockReader.keepAccessible(
      pages.filter((block) => block.lifecycle === PageLifecycle.TRASHED),
      viewer,
    );
    return this.prisma.transaction((transaction) =>
      this.purgeRepository.schedule(transaction, {
        pageIds: accessible.map(({ block }) => block.id),
        purgeAfter,
        requestedById: userId,
        workspaceId,
      }),
    );
  }

  private async findDefaultTemplate(collectionId: string, viewer: PageViewer): Promise<AccessiblePage | null> {
    const collection = await this.templateRepository.findCollection(collectionId, viewer);
    return collection === null ? null : this.templateRepository.findDefaultTemplate(collection, viewer);
  }

  private async findAccessiblePage(pageId: string, viewer: PageViewer): Promise<AccessiblePage | null> {
    const blocks = await this.blockReader.readPageBlocks([pageId]);
    const [page] = await this.blockReader.keepAccessible(blocks, viewer);
    return page ?? null;
  }

  private async findAccessibleSpaceIds(viewer: PageViewer, spaceId: null | string): Promise<readonly string[]> {
    const isVisible = buildSpaceVisibilityFilter(viewer.userId, viewer.role);
    const spaces = await this.prisma.models.Space.select('id')
      .where((space) =>
        and(
          space.workspaceId.eq(viewer.workspaceId),
          isVisible(space),
          ...(spaceId === null ? [] : [space.id.eq(spaceId)]),
        ),
      )
      .all();
    return spaces.map((space) => space.id);
  }

  private toTrashedSummary(
    block: AccessiblePage['block'],
    hierarchy: readonly AccessiblePage['block'][],
    lifecycleById: ReadonlyMap<string, PageLifecycle>,
    deletedBy: ReadonlyMap<string, { id: string; name: string }>,
  ): TrashedPageSummary {
    const trashedChildCount = collectDescendantIds(block.id, hierarchy).filter(
      (id) => lifecycleById.get(id) === PageLifecycle.TRASHED,
    ).length;
    return {
      deletedAt: block.trashedAt ?? block.editedAt,
      deletedBy: deletedBy.get(block.editedById) ?? null,
      id: block.id,
      isTemplate: isPageTemplate(block.properties),
      parentId: block.parentId,
      purgeAfter: block.purgeAfter,
      spaceId: block.spaceId,
      title: readBlockTitle(block.properties),
      trashedChildCount,
    };
  }
}
