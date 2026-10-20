import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { BLOCK_PAGE_TYPE } from '../../../constants/blocks.constants';
import type { BlockLinkDraft } from '../../../domain/block.transaction.domain.types';
import { toRecord } from '../../../infrastructure/persistence/block.repository';
import { blockJsonValueSchema, blockLinkKindSchema } from '../../../schemas/block.row.schemas';
import {
  BLOCK_MIGRATION_HIERARCHY_READ_SIZE,
  BLOCK_MIGRATION_ID_LOOKUP_SIZE,
  BLOCK_MIGRATION_INSERT_SIZE,
} from '../../constants/block.migration.constants';
import type {
  MigratedBlock,
  MigratedPage,
  MigrationPageNode,
  MigrationPageRow,
  StoredBlockColumns,
  StoredMigrationBlock,
  StoredPageBlocks,
} from '../../types/block.migration.types';
import { splitIntoChunks } from '../../utils/block.migration.chunk.utils';

const toInsertRow = (block: MigratedBlock) => ({
  alive: block.alive,
  children: [...block.children],
  createdAt: block.createdAt,
  createdById: block.createdById,
  editedAt: block.editedAt,
  editedById: block.editedById,
  format: blockJsonValueSchema.parse(block.format),
  id: block.id,
  lifecycle: block.lifecycle,
  lockedAt: block.lockedAt,
  lockedById: block.lockedById,
  ownerId: block.ownerId,
  parentId: block.parentId,
  permissions: blockJsonValueSchema.parse(block.permissions),
  properties: blockJsonValueSchema.parse(block.properties),
  purgeAfter: block.purgeAfter,
  spaceId: block.spaceId,
  text: block.text,
  textState: block.textState === null ? null : Buffer.from(block.textState),
  trashedAt: block.trashedAt,
  type: block.type,
  verificationExpiresAt: block.verificationExpiresAt,
  verifiedAt: block.verifiedAt,
  verifiedById: block.verifiedById,
  version: block.version,
});

const toStoredBlock = (row: StoredBlockColumns, pageId: string): StoredMigrationBlock => ({
  ...toRecord(row),
  lockedById: row.lockedById,
  ownerId: row.ownerId,
  pageId,
  purgeAfter: row.purgeAfter,
  textState: row.textState === null ? null : new Uint8Array(row.textState),
  trashedAt: row.trashedAt,
  verificationExpiresAt: row.verificationExpiresAt,
  verifiedAt: row.verifiedAt,
  verifiedById: row.verifiedById,
});

/** Every statement is bounded: ids go in lists of fixed size and rows are read and written in fixed batches. */
@Injectable()
export class BlockMigrationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Every page without its content, by id, in fixed reads. */
  async listPageNodes(): Promise<MigrationPageNode[]> {
    const nodes: MigrationPageNode[] = [];
    let cursor: string | null = null;
    for (;;) {
      const batch: MigrationPageNode[] = await this.readNodeBatch(cursor);
      nodes.push(...batch);
      cursor = batch.at(-1)?.id ?? null;
      if (batch.length < BLOCK_MIGRATION_HIERARCHY_READ_SIZE) return nodes;
    }
  }

  private async readNodeBatch(after: string | null): Promise<MigrationPageNode[]> {
    const pages = this.prisma.models.Page.select('id', 'spaceId', 'parentId', 'order', 'createdAt');
    return await (after === null ? pages : pages.where((page) => page.id.gt(after)))
      .orderBy((page) => page.id.asc())
      .limit(BLOCK_MIGRATION_HIERARCHY_READ_SIZE)
      .all();
  }

  async readPages(pageIds: readonly string[]): Promise<MigrationPageRow[]> {
    const rows = await this.prisma.models.Page.where((page) => page.id.in([...pageIds])).all();
    return rows.map((row) => ({
      content: row.content,
      cover: row.cover,
      createdAt: row.createdAt,
      createdById: row.createdById,
      icon: row.icon,
      id: row.id,
      lifecycle: row.lifecycle,
      lockedAt: row.lockedAt,
      lockedById: row.lockedById,
      order: row.order,
      ownerId: row.ownerId,
      parentId: row.parentId,
      propertyValues: row.propertyValues,
      purgeAfter: row.purgeAfter,
      spaceId: row.spaceId,
      title: row.title,
      trashedAt: row.trashedAt,
      updatedAt: row.updatedAt,
      updatedById: row.updatedById,
      verificationExpiresAt: row.verificationExpiresAt,
      verifiedAt: row.verifiedAt,
      verifiedById: row.verifiedById,
    }));
  }

  async findExistingBlockIds(blockIds: readonly string[]): Promise<Set<string>> {
    const found = new Set<string>();
    for (const chunk of splitIntoChunks([...new Set(blockIds)], BLOCK_MIGRATION_ID_LOOKUP_SIZE)) {
      const rows = await this.prisma.models.Block.select('id')
        .where((block) => block.id.in(chunk))
        .all();
      for (const row of rows) found.add(row.id);
    }
    return found;
  }

  /** The pages of one batch land together or not at all; a parent is listed before its children. */
  async insertPages(pages: readonly MigratedPage[]): Promise<number> {
    const rows = pages.flatMap((migrated) => [migrated.page, ...migrated.blocks]);
    await this.prisma.transaction(async (transaction) => {
      for (const chunk of splitIntoChunks(rows, BLOCK_MIGRATION_INSERT_SIZE)) {
        await transaction.orm.public.Block.createAndCount(chunk.map(toInsertRow));
      }
    });
    return rows.length;
  }

  /** A link that exists is left as it is, so the same links can be offered again after a stop. */
  async insertLinks(links: readonly BlockLinkDraft[]): Promise<number> {
    let inserted = 0;
    for (const chunk of splitIntoChunks(links, BLOCK_MIGRATION_INSERT_SIZE)) {
      inserted += await this.prisma.models.BlockLink.createAndCount(
        chunk.map((link) => ({ ...link })),
        { onConflict: 'skip' },
      );
    }
    return inserted;
  }

  async readStoredLinks(pageIds: readonly string[]): Promise<BlockLinkDraft[]> {
    const links: BlockLinkDraft[] = [];
    for (const chunk of splitIntoChunks(pageIds, BLOCK_MIGRATION_ID_LOOKUP_SIZE)) {
      const rows = await this.prisma.models.BlockLink.where((link) => link.sourcePageId.in(chunk)).all();
      links.push(
        ...rows.map((row) => ({
          kind: blockLinkKindSchema.parse(row.kind),
          sourceBlockId: row.sourceBlockId,
          sourcePageId: row.sourcePageId,
          targetBlockId: row.targetBlockId,
        })),
      );
    }
    return links;
  }

  /** The page block of each page that has one, with the blocks below it; a child page is another page's own. */
  async readStoredPages(pageIds: readonly string[]): Promise<Map<string, StoredPageBlocks>> {
    const pageRows = await this.readBlocksByIds(pageIds);
    const stored = new Map<string, StoredPageBlocks>();
    const ownerByBlockId = new Map(pageRows.map((row) => [row.id, row.id]));
    const contentByPage = new Map<string, StoredMigrationBlock[]>(pageRows.map((row) => [row.id, []]));
    let frontier = pageRows.map((row) => row.id);
    while (frontier.length > 0) {
      const children = await this.readContentChildren(frontier);
      const next: string[] = [];
      for (const child of children) {
        const pageId = child.parentId === null ? undefined : ownerByBlockId.get(child.parentId);
        if (pageId === undefined) continue;
        ownerByBlockId.set(child.id, pageId);
        contentByPage.get(pageId)?.push(toStoredBlock(child, pageId));
        next.push(child.id);
      }
      frontier = next;
    }
    for (const row of pageRows) {
      stored.set(row.id, { blocks: contentByPage.get(row.id) ?? [], page: toStoredBlock(row, row.id) });
    }
    return stored;
  }

  private async readBlocksByIds(blockIds: readonly string[]): Promise<StoredBlockColumns[]> {
    const rows: StoredBlockColumns[] = [];
    for (const chunk of splitIntoChunks(blockIds, BLOCK_MIGRATION_ID_LOOKUP_SIZE)) {
      rows.push(...(await this.prisma.models.Block.where((block) => block.id.in(chunk)).all()));
    }
    return rows;
  }

  private async readContentChildren(parentIds: readonly string[]): Promise<StoredBlockColumns[]> {
    const rows: StoredBlockColumns[] = [];
    for (const chunk of splitIntoChunks(parentIds, BLOCK_MIGRATION_ID_LOOKUP_SIZE)) {
      rows.push(
        ...(await this.prisma.models.Block.where((block) => block.parentId.in(chunk))
          .where((block) => block.type.neq(BLOCK_PAGE_TYPE))
          .all()),
      );
    }
    return rows;
  }
}
