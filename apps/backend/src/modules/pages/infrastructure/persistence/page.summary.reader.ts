import { Inject, Injectable } from '@nestjs/common';
import { type NeumaTransaction, PageLifecycle } from '@neuma/db';
import { canEditBlock, type PageContent } from '@neuma/shared';
import { PinoLogger } from 'nestjs-pino';
import { readBlockTitle } from '../../../../common/domain/block-access.domain';
import { findLatestPageVersions } from '../../../../common/infrastructure/persistence/page-latest-version.lib';
import { PrismaService } from '../../../../prisma/prisma.service';
import { readPageCover, readPageIcon, readPageValues } from '../../domain/page.block.domain';
import type { PageContentBlock } from '../../domain/page.block.domain.types';
import { buildPageDocument } from '../../domain/page.document.domain';
import { pageStoredJsonSchema } from '../../schemas/page.block.schemas';
import type { AccessiblePage, PageLastEdit, PageSummaryParts } from '../../types/page.block.types';
import type { PageSummary, StoredPageBlock } from '../../types/page.types';
import { PageBlockReader } from './page.block.reader';

/** The page changes when anything it holds does: the latest edit among the page block and its own blocks. */
const findLastEdit = (block: StoredPageBlock, content: readonly PageContentBlock[]): PageLastEdit =>
  content.reduce<PageLastEdit>(
    (latest, entry) => (entry.editedAt > latest.at ? { at: entry.editedAt, byId: entry.editedById } : latest),
    { at: block.editedAt, byId: block.editedById },
  );

const listUserIds = (block: StoredPageBlock, lastEdit: PageLastEdit): string[] =>
  [block.createdById, lastEdit.byId, block.ownerId, block.verifiedById].filter(
    (userId): userId is string => userId !== null,
  );

/** Builds what the API returns for a page: the block's own columns, its document, its place and its authors. */
@Injectable()
export class PageSummaryReader {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockReader: PageBlockReader,
    @Inject(PinoLogger) private readonly logger: PinoLogger,
  ) {}

  /** A page whose blocks this version cannot assemble into a document is left out and counted in the log. */
  async summarizeAll(pages: readonly AccessiblePage[], transaction?: NeumaTransaction): Promise<PageSummary[]> {
    const parts = await this.readParts(pages, transaction);
    const summaries = pages.map((page) => ({ page, summary: this.compose(page, parts) }));
    const unreadable = summaries.filter(({ summary }) => summary.content === null);
    if (unreadable.length > 0) {
      this.logger.error(
        { pageIds: unreadable.map(({ page }) => page.block.id), unreadableCount: unreadable.length },
        'pages left out of a read because their blocks do not make a document',
      );
    }
    return summaries.filter(({ summary }) => summary.content !== null).map(({ summary }) => summary);
  }

  /** A single page is still answered when its document is unreadable, with no content, so the caller can say so. */
  async summarizeOne(page: AccessiblePage, transaction?: NeumaTransaction): Promise<PageSummary> {
    const parts = await this.readParts([page], transaction);
    const summary = this.compose(page, parts);
    if (summary.content === null) {
      this.logger.error(
        { pageId: page.block.id },
        'a page was read without a document because its blocks do not make one',
      );
    }
    return summary;
  }

  /** The document of a page, or null when the page does not exist or its blocks do not make one. */
  async readDocument(viewed: AccessiblePage): Promise<PageContent | null> {
    const [block] = await this.blockReader.readPageBlocks([viewed.block.id]);
    if (block === undefined) return null;
    const visible = await this.blockReader.readVisibleContentBlocks([{ ...viewed, block }]);
    const document = buildPageDocument(block, visible.get(block.id)?.readable ?? []);
    return document.isOk() ? document.getValue() : null;
  }

  private async readParts(pages: readonly AccessiblePage[], transaction?: NeumaTransaction): Promise<PageSummaryParts> {
    const blocks = pages.map((page) => page.block);
    const visible = await this.blockReader.readVisibleContentBlocks(pages, transaction);
    const contents = new Map(blocks.map((block) => [block.id, visible.get(block.id)?.readable ?? []]));
    const userIds = blocks.flatMap((block) => listUserIds(block, findLastEdit(block, contents.get(block.id) ?? [])));
    const [positions, users, versions] = await Promise.all([
      this.blockReader.readPositions(blocks),
      this.blockReader.readUsers(userIds),
      findLatestPageVersions(
        this.prisma,
        blocks.map((block) => block.id),
        transaction,
      ),
    ]);
    return { contents, positions, users, versions };
  }

  private compose({ access, block }: AccessiblePage, parts: PageSummaryParts): PageSummary {
    const content = parts.contents.get(block.id) ?? [];
    const lastEdit = findLastEdit(block, content);
    const document = buildPageDocument(block, content);
    return {
      canEdit: canEditBlock(access.role),
      content: document.isOk() ? pageStoredJsonSchema.parse(document.getValue()) : null,
      cover: readPageCover(block.format),
      createdAt: block.createdAt,
      createdBy: parts.users.get(block.createdById) ?? null,
      hasOwnPermissions: block.permissions !== null,
      icon: readPageIcon(block.format),
      id: block.id,
      lifecycle: access.isInTrash ? PageLifecycle.TRASHED : block.lifecycle,
      lockedAt: block.lockedAt,
      order: parts.positions.get(block.id) ?? 0,
      owner: block.ownerId === null ? null : (parts.users.get(block.ownerId) ?? null),
      parentId: block.parentId,
      propertyValues: readPageValues(block.properties),
      spaceId: block.spaceId,
      title: readBlockTitle(block.properties),
      updatedAt: lastEdit.at,
      updatedBy: parts.users.get(lastEdit.byId) ?? null,
      verificationExpiresAt: block.verificationExpiresAt,
      verifiedAt: block.verifiedAt,
      verifiedBy: block.verifiedById === null ? null : (parts.users.get(block.verifiedById) ?? null),
      version: parts.versions.get(block.id) ?? 0,
    };
  }
}
