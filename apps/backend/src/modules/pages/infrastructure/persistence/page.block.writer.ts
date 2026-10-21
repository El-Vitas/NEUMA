import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { PageLifecycle } from '@neuma/db';
import {
  givePageBlocksTheirIds,
  type PageContent,
  type PageCoverValue,
  type PageIcon,
  pageContentSchema,
  Result,
} from '@neuma/shared';
import { BLOCK_WRITER } from '../../../../common/constants/block-writer.constants';
import { readBlockTitle } from '../../../../common/domain/block-access.domain';
import type { BlockWriter, BlockWriteWithin } from '../../../../common/types/block-writer.types';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PAGE_TRANSACTION_KIND } from '../../constants/pages.constants';
import { readPageCover, readPageIcon, readPageValues } from '../../domain/page.block.domain';
import type { PageBlockOperation, PageContentBlock, PageContentSnapshot } from '../../domain/page.block.domain.types';
import { buildPageDocument, buildPageTree } from '../../domain/page.document.domain';
import { listDocumentBlockIds, rewriteDocumentIds } from '../../domain/page.document.ids.domain';
import { collectDescendantIds } from '../../domain/page.domain';
import { PageLifecycleError } from '../../domain/page.error';
import {
  buildCoverOperation,
  buildCreatePageOperations,
  buildIconOperation,
  buildLifecycleOperation,
  buildLockOperation,
  buildMoveOperations,
  buildOwnerOperation,
  buildReorderOperation,
  buildSpaceMoveOperation,
  buildTitleOperation,
  buildValueChangeOperations,
  buildVerificationOperation,
  diffPageValues,
  planContentOperations,
} from '../../domain/page.operation.domain';
import type { AccessiblePage, PageViewer } from '../../types/page.block.types';
import type {
  DuplicatePageInput,
  NewPageInput,
  PageContentRewrite,
  PageContentWriter,
  PagePropertyValuesMerge,
  PageRestoreOutcome,
  PageSummary,
  UpdatePagePropertyValuesInput,
} from '../../types/page.types';
import { PageBlockWriteError } from '../errors/page.block-write.error';
import { PageStoredContentInvalidError } from '../errors/page.stored-content.error';
import { PageBlockReader } from './page.block.reader';
import { readWriteFailure } from './page.block-write.lib';
import { PagePurgeRepository } from './page.purge.repository';
import { PageSummaryReader } from './page.summary.reader';
import { PageVersionRepository } from './page.version.repository';

const toViewer = (workspaceId: string, userId: string, role: PageViewer['role']): PageViewer => ({
  role,
  userId,
  workspaceId,
});

/** Every change to a page goes to the blocks module as operations, with the same checks and notices as an edit. */
@Injectable()
export class PageBlockWriter {
  constructor(
    @Inject(BLOCK_WRITER) private readonly blockWriter: BlockWriter,
    private readonly prisma: PrismaService,
    private readonly blockReader: PageBlockReader,
    private readonly summaryReader: PageSummaryReader,
    private readonly versionRepository: PageVersionRepository,
    private readonly purgeRepository: PagePurgeRepository,
  ) {}

  async create(input: NewPageInput): Promise<PageSummary | null> {
    const viewer = toViewer(input.workspaceId, input.userId, input.role);
    const pageId = randomUUID();
    const content = await this.makeIdsFresh(input.content, new Set());
    const tree = buildPageTree({
      content,
      cover: null,
      icon: null,
      pageId,
      parentId: input.parentId,
      propertyValues: input.propertyValues,
      spaceId: input.spaceId,
      title: input.title,
    });
    if (tree.isFail()) throw tree.getError();
    const operations = buildCreatePageOperations(tree.getValue(), { afterSiblingId: null });
    if (!(await this.apply(viewer, input.spaceId, operations))) return null;
    await this.versionRepository.record(pageId, input.createdById);
    return this.readSummary(pageId, viewer);
  }

  /** The copy goes right after the original; only its root is renamed, and every id of the copy is new. */
  async duplicate(input: DuplicatePageInput): Promise<PageSummary | null> {
    const viewer = toViewer(input.workspaceId, input.userId, input.role);
    const original = await this.findPage(input.pageId, viewer);
    if (original === null || original.access.isInTrash) return null;
    const branch = await this.listBranch(original, input.includeChildren, viewer);
    const copies = await this.planCopies(branch, input.title);
    const operations = copies.flatMap((copy, index) =>
      buildCreatePageOperations(copy.tree, { afterSiblingId: index === 0 ? original.block.id : null }),
    );
    if (!(await this.apply(viewer, original.block.spaceId, operations))) return null;
    for (const copy of copies) await this.versionRepository.record(copy.tree.page.id, input.userId);
    return this.readSummary(copies[0]?.tree.page.id ?? '', viewer);
  }

  async rename(
    pageId: string,
    title: string,
    userId: string,
    workspaceId: string,
    role: PageViewer['role'],
  ): Promise<PageSummary | null> {
    return this.changePage(pageId, toViewer(workspaceId, userId, role), () => [buildTitleOperation(pageId, title)]);
  }

  async updateIcon(
    pageId: string,
    icon: PageIcon | null,
    userId: string,
    workspaceId: string,
    role: PageViewer['role'],
  ): Promise<PageSummary | null> {
    return this.changePage(pageId, toViewer(workspaceId, userId, role), () => [buildIconOperation(pageId, icon)]);
  }

  async updateCover(
    pageId: string,
    cover: PageCoverValue | null,
    userId: string,
    workspaceId: string,
    role: PageViewer['role'],
  ): Promise<PageSummary | null> {
    return this.changePage(pageId, toViewer(workspaceId, userId, role), () => [buildCoverOperation(pageId, cover)]);
  }

  async setLocked(
    pageId: string,
    isLocked: boolean,
    userId: string,
    workspaceId: string,
    role: PageViewer['role'],
  ): Promise<PageSummary | null> {
    return this.changePage(pageId, toViewer(workspaceId, userId, role), () => [buildLockOperation(pageId, isLocked)]);
  }

  async setVerification(
    pageId: string,
    isVerified: boolean,
    expiresAt: Date | null,
    userId: string,
    workspaceId: string,
    role: PageViewer['role'],
  ): Promise<PageSummary | null> {
    return this.changePage(pageId, toViewer(workspaceId, userId, role), () => [
      buildVerificationOperation(pageId, isVerified, expiresAt),
    ]);
  }

  async setOwner(
    pageId: string,
    ownerId: null | string,
    userId: string,
    workspaceId: string,
    role: PageViewer['role'],
  ): Promise<PageSummary | null> {
    return this.changePage(pageId, toViewer(workspaceId, userId, role), () => [buildOwnerOperation(pageId, ownerId)]);
  }

  /** Writes only the values that changed, so a value another person set meanwhile is not sent back stale. */
  async updatePropertyValues<TError>(
    input: UpdatePagePropertyValuesInput,
    merge: PagePropertyValuesMerge<TError>,
  ): Promise<Result<PageSummary, TError> | null> {
    const viewer = toViewer(input.workspaceId, input.updatedById, input.role);
    const page = await this.findPage(input.pageId, viewer);
    if (page === null) return null;
    const current = readPageValues(page.block.properties);
    const merged = merge(current);
    if (merged.isFail()) return Result.fail(merged.getError());
    const operations = [
      ...(input.title === undefined ? [] : [buildTitleOperation(input.pageId, input.title)]),
      ...buildValueChangeOperations(input.pageId, diffPageValues(current, merged.getValue())),
    ];
    if (operations.length > 0 && !(await this.apply(viewer, page.block.spaceId, operations))) return null;
    const summary = await this.readSummary(input.pageId, viewer);
    return summary === null ? null : Result.ok(summary);
  }

  /** A page goes last among the pages of its new parent; one that changes space goes with everything below it. */
  async move(
    pageId: string,
    parentId: null | string,
    targetSpaceId: string,
    userId: string,
    workspaceId: string,
    role: PageViewer['role'],
    mutationId: string,
  ): Promise<PageSummary | null> {
    const viewer = toViewer(workspaceId, userId, role);
    const page = await this.findPage(pageId, viewer);
    if (page === null || page.access.isInTrash) return null;
    const readableSpaceIds = await this.blockReader.readReadableSpaceIds([targetSpaceId], viewer);
    if (!readableSpaceIds.has(targetSpaceId)) return null;
    const isMoved =
      targetSpaceId === page.block.spaceId
        ? await this.moveWithinSpace(page, parentId, viewer, mutationId)
        : await this.moveToSpace(page, parentId, targetSpaceId, viewer, mutationId);
    return isMoved ? this.readSummary(pageId, viewer) : null;
  }

  /** The page is placed before one of its siblings, or last, by the list of the page that holds it. */
  async reorderAmongSiblings(
    pageId: string,
    beforePageId: null | string,
    userId: string,
    workspaceId: string,
    role: PageViewer['role'],
  ): Promise<readonly PageSummary[] | null> {
    const viewer = toViewer(workspaceId, userId, role);
    const page = await this.findPage(pageId, viewer);
    if (page === null) return null;
    const { parentId, spaceId } = page.block;
    const siblingIds = await this.blockReader.readSiblingIds(spaceId, parentId);
    if (beforePageId !== null && !siblingIds.includes(beforePageId)) return null;
    const operations = [buildReorderOperation({ parentId, spaceId }, pageId, beforePageId)];
    if (!(await this.apply(viewer, spaceId, operations))) return null;
    return this.readSiblings(spaceId, parentId, viewer);
  }

  async trashCascade(
    pageId: string,
    userId: string,
    workspaceId: string,
    role: PageViewer['role'],
    mutationId: string,
  ): Promise<boolean> {
    const viewer = toViewer(workspaceId, userId, role);
    const page = await this.findPage(pageId, viewer);
    if (page === null || page.access.isInTrash) return false;
    const operations = [buildLifecycleOperation(pageId, PageLifecycle.TRASHED, null)];
    const transactionId = `${PAGE_TRANSACTION_KIND.trash}:${pageId}:${mutationId}`;
    return this.applyLifecycle(viewer, page.block.spaceId, operations, transactionId);
  }

  /**
   * The page comes back to its parent at the place it kept in the parent's list. When the parent is in the trash it
   * goes to the root of its space instead. With `includeChildren`, the pages below it that were trashed on their own
   * come back too; the rest were never out of the page.
   */
  async restoreCascade(
    pageId: string,
    userId: string,
    workspaceId: string,
    role: PageViewer['role'],
    mutationId: string,
    includeChildren: boolean,
  ): Promise<null | PageRestoreOutcome> {
    const viewer = toViewer(workspaceId, userId, role);
    const page = await this.findPage(pageId, viewer);
    if (page?.block.lifecycle !== PageLifecycle.TRASHED) return null;
    const parent = await this.findRestoreParent(page);
    const restoredChildIds = includeChildren ? await this.listTrashedDescendantIds(page) : [];
    const operations = [
      buildLifecycleOperation(pageId, PageLifecycle.ACTIVE, parent.isInTrash ? page.block.parentId : null),
      ...restoredChildIds.map((childId) => buildLifecycleOperation(childId, PageLifecycle.ACTIVE, null)),
    ];
    const transactionId = `${PAGE_TRANSACTION_KIND.restore}:${pageId}:${mutationId}`;
    if (!(await this.applyLifecycle(viewer, page.block.spaceId, operations, transactionId))) return null;
    await this.prisma.transaction((transaction) =>
      this.purgeRepository.cancel(transaction, [pageId, ...restoredChildIds], new Date()),
    );
    return {
      parentTitle: parent.isInTrash ? null : parent.title,
      restoredChildCount: restoredChildIds.length,
      restoredToRoot: parent.isInTrash,
      spaceName: parent.isInTrash ? await this.findSpaceName(page.block.spaceId) : null,
    };
  }

  /** The rewrite sees the document the page has and the result is applied by id, so blocks it leaves alone stay. */
  async writeContent(writer: PageContentWriter, rewrite: PageContentRewrite): Promise<PageContent | null> {
    const viewer = toViewer(writer.workspaceId, writer.userId, writer.role);
    const page = await this.findPage(writer.pageId, viewer);
    if (page === null) return null;
    const current = await this.summaryReader.readDocument(page);
    if (current === null) throw new PageStoredContentInvalidError(writer.pageId, 'the blocks do not make a document');
    const next = pageContentSchema.parse(rewrite(current));
    if ((await this.applyContent(writer.pageId, viewer, next)) === 'DENIED') return null;
    return (await this.summaryReader.readDocument(page)) ?? next;
  }

  /** The page becomes what a version said: its blocks by id, then its title. */
  async restoreVersion(
    pageId: string,
    content: PageContent,
    title: string,
    userId: string,
    workspaceId: string,
    role: PageViewer['role'],
  ): Promise<PageSummary | null> {
    const viewer = toViewer(workspaceId, userId, role);
    const page = await this.findPage(pageId, viewer);
    if (page === null) return null;
    await this.versionRepository.record(pageId, userId, { fold: false });
    if ((await this.applyContent(pageId, viewer, content, false)) === 'DENIED') return null;
    if (readBlockTitle(page.block.properties) !== title) {
      const renamed = await this.apply(viewer, page.block.spaceId, [buildTitleOperation(pageId, title)]);
      if (!renamed) return null;
    }
    await this.versionRepository.record(pageId, userId, { fold: false });
    return this.readSummary(pageId, viewer);
  }

  private async changePage(
    pageId: string,
    viewer: PageViewer,
    buildOperations: () => PageBlockOperation[],
  ): Promise<PageSummary | null> {
    const page = await this.findPage(pageId, viewer);
    if (page === null) return null;
    if (!(await this.apply(viewer, page.block.spaceId, buildOperations()))) return null;
    return this.readSummary(pageId, viewer);
  }

  private async moveWithinSpace(
    page: AccessiblePage,
    parentId: null | string,
    viewer: PageViewer,
    mutationId: string,
  ): Promise<boolean> {
    const spaceId = page.block.spaceId;
    const operations = buildMoveOperations(
      page.block.id,
      { parentId: page.block.parentId, spaceId },
      { parentId, spaceId },
    );
    const transactionId = `${PAGE_TRANSACTION_KIND.move}:${page.block.id}:${mutationId}`;
    return this.apply(viewer, page.block.spaceId, operations, transactionId);
  }

  /** One transaction: the page and its branch change space and land under their new parent, or at the top. */
  private async moveToSpace(
    page: AccessiblePage,
    parentId: null | string,
    targetSpaceId: string,
    viewer: PageViewer,
    mutationId: string,
  ): Promise<boolean> {
    const operations = [
      buildSpaceMoveOperation(page.block.id, { parentId, spaceId: targetSpaceId }, page.block.parentId),
    ];
    const transactionId = `${PAGE_TRANSACTION_KIND.move}:${page.block.id}:${mutationId}`;
    return this.apply(viewer, page.block.spaceId, operations, transactionId);
  }

  private async findRestoreParent(page: AccessiblePage): Promise<{ isInTrash: boolean; title: null | string }> {
    if (page.block.parentId === null) return { isInTrash: false, title: null };
    const [parent] = await this.blockReader.readPageBlocks([page.block.parentId]);
    if (parent === undefined) return { isInTrash: false, title: null };
    const chains = await this.blockReader.readAncestry([parent.id]);
    const isInTrash = (chains.get(parent.id) ?? []).some((link) => link.lifecycle === PageLifecycle.TRASHED);
    return { isInTrash, title: readBlockTitle(parent.properties) };
  }

  private async listTrashedDescendantIds(page: AccessiblePage): Promise<string[]> {
    const pages = await this.blockReader.readSpacePageBlocks(page.block.spaceId);
    const lifecycleById = new Map(pages.map((entry) => [entry.id, entry.lifecycle]));
    return collectDescendantIds(page.block.id, pages).filter((id) => lifecycleById.get(id) === PageLifecycle.TRASHED);
  }

  private async findSpaceName(spaceId: string): Promise<null | string> {
    const space = await this.prisma.models.Space.select('name').where({ id: spaceId }).first();
    return space?.name ?? null;
  }

  /** The pages a duplicate copies, the original first and every page below it after its parent. */
  private async listBranch(
    original: AccessiblePage,
    includeChildren: boolean,
    viewer: PageViewer,
  ): Promise<AccessiblePage[]> {
    if (!includeChildren) return [original];
    const pages = await this.blockReader.readSpacePageBlocks(original.block.spaceId);
    const belowIds = new Set(collectDescendantIds(original.block.id, pages));
    const accessible = await this.blockReader.keepAccessible(
      pages.filter((entry) => belowIds.has(entry.id)),
      viewer,
    );
    const copiable = new Map(accessible.filter(({ access }) => !access.isInTrash).map((page) => [page.block.id, page]));
    const ordered: AccessiblePage[] = [original];
    for (let cursor = 0; cursor < ordered.length; cursor += 1) {
      const children = ordered[cursor]?.block.children ?? [];
      for (const childId of children) {
        const child = copiable.get(childId);
        if (child !== undefined) ordered.push(child);
      }
    }
    return ordered;
  }

  private async planCopies(branch: readonly AccessiblePage[], rootTitle: null | string) {
    const visible = await this.blockReader.readVisibleContentBlocks(branch);
    const documents = branch.map((page) => {
      const document = buildPageDocument(page.block, visible.get(page.block.id)?.readable ?? []);
      if (document.isFail()) throw document.getError();
      return document.getValue();
    });
    const maps = {
      blocks: new Map(documents.flatMap(listDocumentBlockIds).map((id) => [id, randomUUID()])),
      pages: new Map(branch.map((page) => [page.block.id, randomUUID()])),
    };
    return branch.map((page, index) => {
      const rewritten = rewriteDocumentIds(documents[index] ?? { content: [], schemaVersion: 1, type: 'doc' }, maps);
      if (rewritten.isFail()) throw rewritten.getError();
      const copyId = maps.pages.get(page.block.id) ?? '';
      const tree = buildPageTree({
        content: rewritten.getValue(),
        cover: readPageCover(page.block.format),
        icon: readPageIcon(page.block.format),
        pageId: copyId,
        parentId: index === 0 ? page.block.parentId : (maps.pages.get(page.block.parentId ?? '') ?? null),
        propertyValues: readPageValues(page.block.properties),
        spaceId: page.block.spaceId,
        title:
          index === 0 ? (rootTitle ?? readBlockTitle(page.block.properties)) : readBlockTitle(page.block.properties),
      });
      if (tree.isFail()) throw tree.getError();
      return { tree: tree.getValue() };
    });
  }

  /** A block id of a document belongs to one block of the whole database: the ones taken elsewhere get a new id. */
  private async makeIdsFresh(content: PageContent, ownIds: ReadonlySet<string>): Promise<PageContent> {
    const foreignIds = listDocumentBlockIds(content).filter((id) => !ownIds.has(id));
    const taken = await this.blockReader.findExistingBlockIds(foreignIds);
    if (taken.size === 0) return content;
    const rewritten = rewriteDocumentIds(content, {
      blocks: new Map([...taken].map((id) => [id, randomUUID()])),
      pages: new Map(),
    });
    if (rewritten.isFail()) throw rewritten.getError();
    return rewritten.getValue();
  }

  /**
   * An id the document uses that no block of the page has yet: when a removed block of this page owns it, the block
   * comes back; when it is anyone else's, the document gets a new id for it.
   */
  private async claimDocumentIds(
    pageId: string,
    content: PageContent,
    stored: readonly PageContentBlock[],
  ): Promise<{ content: PageContent; removed: PageContentBlock[] }> {
    const storedIds = new Set(stored.map((block) => block.id));
    const newIds = listDocumentBlockIds(content).filter((id) => !storedIds.has(id));
    const taken = await this.blockReader.findExistingBlockIds(newIds);
    if (taken.size === 0) return { content, removed: [] };
    const removed = await this.blockReader.readRemovedContentBlocks(pageId, [...taken]);
    const removedIds = new Set(removed.map((block) => block.id));
    const foreignIds = [...taken].filter((id) => !removedIds.has(id));
    if (foreignIds.length === 0) return { content, removed };
    const rewritten = rewriteDocumentIds(content, {
      blocks: new Map(foreignIds.map((id) => [id, randomUUID()])),
      pages: new Map(),
    });
    if (rewritten.isFail()) throw rewritten.getError();
    return { content: rewritten.getValue(), removed };
  }

  /** Turns the blocks of a page into the ones a document describes, and cuts a version if the page changed. */
  private async applyContent(
    pageId: string,
    viewer: PageViewer,
    content: PageContent,
    shouldRecord = true,
  ): Promise<'APPLIED' | 'DENIED' | 'UNCHANGED'> {
    const viewed = await this.findPage(pageId, viewer);
    if (viewed === null) return 'DENIED';
    const { block: page } = viewed;
    const visible = await this.blockReader.readVisibleContentBlocks([viewed]);
    const stored = visible.get(pageId)?.readable ?? [];
    const claimed = await this.claimDocumentIds(pageId, givePageBlocksTheirIds(content, randomUUID), stored);
    const snapshot: PageContentSnapshot = {
      blocks: stored,
      pageChildren: page.children,
      pageId,
      removed: claimed.removed,
    };
    const tree = buildPageTree({
      content: claimed.content,
      cover: null,
      icon: null,
      pageId,
      parentId: page.parentId,
      propertyValues: null,
      spaceId: page.spaceId,
      title: '',
    });
    if (tree.isFail()) throw tree.getError();
    const operations = planContentOperations(snapshot, tree.getValue());
    if (operations.length === 0) return 'UNCHANGED';
    if (!(await this.apply(viewer, page.spaceId, operations))) return 'DENIED';
    if (shouldRecord) await this.versionRepository.record(pageId, viewer.userId);
    return 'APPLIED';
  }

  private async findPage(pageId: string, viewer: PageViewer): Promise<AccessiblePage | null> {
    const blocks = await this.blockReader.readPageBlocks([pageId]);
    const [page] = await this.blockReader.keepAccessible(blocks, viewer);
    return page ?? null;
  }

  private async readSummary(pageId: string, viewer: PageViewer): Promise<PageSummary | null> {
    const page = await this.findPage(pageId, viewer);
    return page === null ? null : this.summaryReader.summarizeOne(page);
  }

  private async readSiblings(spaceId: string, parentId: null | string, viewer: PageViewer): Promise<PageSummary[]> {
    const siblings = await this.blockReader.readChildPageBlocks(spaceId, parentId);
    const accessible = await this.blockReader.keepAccessible(siblings, viewer);
    const summaries = await this.summaryReader.summarizeAll(accessible.filter(({ access }) => !access.isInTrash));
    return summaries.toSorted((first, second) => first.order - second.order);
  }

  /** True when the blocks module applied the operations; false when it answered as for a page that is not there. */
  async apply(
    viewer: PageViewer,
    spaceId: string,
    operations: readonly PageBlockOperation[],
    transactionId: string = randomUUID(),
    within?: BlockWriteWithin,
  ): Promise<boolean> {
    const requests = [{ id: transactionId, operations, spaceId }];
    const response =
      within === undefined
        ? await this.blockWriter.applyTrusted(requests, viewer)
        : await this.blockWriter.applyTrustedWithin(requests, viewer, within);
    const [outcome] = response.transactions;
    if (outcome === undefined) throw new PageBlockWriteError('NO_OUTCOME', 'The blocks module answered nothing', null);
    if (!('error' in outcome)) return true;
    const refusal = readWriteFailure(outcome.error);
    if (refusal === null) return false;
    throw refusal;
  }

  /** A page that is already in the state asked for is not an error here: the caller reads it as not applied. */
  private async applyLifecycle(
    viewer: PageViewer,
    spaceId: string,
    operations: readonly PageBlockOperation[],
    transactionId: string,
  ): Promise<boolean> {
    try {
      return await this.apply(viewer, spaceId, operations, transactionId);
    } catch (error) {
      if (error instanceof PageLifecycleError) return false;
      throw error;
    }
  }
}
