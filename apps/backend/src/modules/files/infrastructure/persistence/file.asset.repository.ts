import { Injectable } from '@nestjs/common';
import { FileAssetLifecycle } from '@neuma/db';
import { canEditBlock, USER_ROLE, type UserRole } from '@neuma/shared';
import { BlockAccessRepository } from '../../../../common/infrastructure/persistence/block-access.repository';
import type { BlockAccessViewer } from '../../../../common/types/block-access.types';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  FILE_ASSET_FIELDS,
  FILE_ASSET_METADATA_FIELDS,
  FILE_REFERENCE_SCAN_LIMIT,
  UNKNOWN_FILE_OWNER_NAME,
} from '../../constants/files.constants';
import type { FileAssetMetadata, FileAssetSummary } from '../../domain/files.domain.types';
import type { FileAssetMetadataRow, FileAssetRepository } from '../../types/files.types';

const toFileAssetSummary = (asset: FileAssetSummary): FileAssetSummary => ({
  checksum: asset.checksum,
  deletedAt: asset.deletedAt,
  id: asset.id,
  lifecycle: asset.lifecycle,
  mimeType: asset.mimeType,
  originalFilename: asset.originalFilename,
  ownerId: asset.ownerId,
  pageId: asset.pageId,
  size: asset.size,
  storageKey: asset.storageKey,
  workspaceId: asset.workspaceId,
});

@Injectable()
export class FileAssetRepositoryImpl implements FileAssetRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockAccess: BlockAccessRepository,
  ) {}

  async canAttachToContent(
    pageId: string | null,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<boolean> {
    if (pageId === null || role === USER_ROLE.CLIENT) return false;
    return this.canEditPage(pageId, workspaceId, userId, role);
  }

  async create(input: Parameters<FileAssetRepository['create']>[0]): Promise<FileAssetSummary> {
    const asset = await this.prisma.models.FileAsset.create(input);
    return toFileAssetSummary(asset);
  }

  async findAccessible(
    assetId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<FileAssetSummary | null> {
    const asset = await this.prisma.models.FileAsset.where({
      id: assetId,
      lifecycle: FileAssetLifecycle.ACTIVE,
      workspaceId,
    })
      .select(...FILE_ASSET_FIELDS)
      .first();
    if (asset === null) return null;
    if (asset.pageId === null) return asset.ownerId === userId || role !== USER_ROLE.CLIENT ? asset : null;
    if (await this.hasPageAccess(asset.pageId, workspaceId, userId, role)) return asset;
    return (await this.isReferencedByReadableBlock(assetId, { role, userId, workspaceId })) ? asset : null;
  }

  async findDeletable(
    assetId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<FileAssetSummary | null> {
    const asset = await this.prisma.models.FileAsset.where({
      id: assetId,
      lifecycle: FileAssetLifecycle.ACTIVE,
      workspaceId,
    })
      .select(...FILE_ASSET_FIELDS)
      .first();
    if (asset === null) return null;
    if (asset.pageId === null) return asset.ownerId === userId ? asset : null;
    return (await this.canEditPage(asset.pageId, workspaceId, userId, role)) ? asset : null;
  }

  async findByPage(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<FileAssetMetadata[] | null> {
    const hasAccess = await this.hasPageAccess(pageId, workspaceId, userId, role);
    if (!hasAccess) return null;
    const assets = await this.prisma.models.FileAsset.where({
      lifecycle: FileAssetLifecycle.ACTIVE,
      pageId,
      workspaceId,
    })
      .select(...FILE_ASSET_METADATA_FIELDS)
      .all();
    return this.withUploaderNames(assets);
  }

  async markDeleted(assetId: string, workspaceId: string, _userId: string): Promise<boolean> {
    const updatedCount = await this.prisma.models.FileAsset.where({
      id: assetId,
      lifecycle: FileAssetLifecycle.ACTIVE,
      workspaceId,
    }).updateAndCount({ deletedAt: new Date(), lifecycle: FileAssetLifecycle.DELETED });
    return updatedCount > 0;
  }

  private async withUploaderNames(assets: FileAssetMetadataRow[]): Promise<FileAssetMetadata[]> {
    const ownerIds = [...new Set(assets.map((asset) => asset.ownerId))];
    const owners = await this.prisma.models.User.where((user) => user.id.in(ownerIds))
      .select('id', 'name')
      .all();
    const ownerNameById = new Map(owners.map((owner) => [owner.id, owner.name] as const));
    return assets.map((asset) => ({
      id: asset.id,
      mimeType: asset.mimeType,
      originalFilename: asset.originalFilename,
      size: asset.size,
      uploadedBy: ownerNameById.get(asset.ownerId) ?? UNKNOWN_FILE_OWNER_NAME,
    }));
  }

  private async hasPageAccess(pageId: string, workspaceId: string, userId: string, role: UserRole): Promise<boolean> {
    const pages = await this.blockAccess.findReadablePages([pageId], { role, userId, workspaceId });
    return pages.length > 0;
  }

  /** Reading is not enough to change what a page holds: the same standing that edits its blocks is required. */
  private async canEditPage(pageId: string, workspaceId: string, userId: string, role: UserRole): Promise<boolean> {
    if (!(await this.hasPageAccess(pageId, workspaceId, userId, role))) return false;
    const standing = await this.blockAccess.findStanding(pageId, { role, userId, workspaceId });
    return standing !== null && canEditBlock(standing.role);
  }

  /** One statement finds the blocks that show the asset: media and file blocks, a page icon or a page cover. */
  private async isReferencedByReadableBlock(assetId: string, viewer: BlockAccessViewer): Promise<boolean> {
    const rows = await this.prisma.runner.query(
      this.prisma.sql`
      SELECT "id" FROM "Block"
      WHERE "alive" AND (
        "properties"->>'assetId' = ${assetId}
        OR "format"->'icon'->>'assetId' = ${assetId}
        OR "format"->'cover'->>'assetId' = ${assetId}
      )
      LIMIT ${FILE_REFERENCE_SCAN_LIMIT}
    `
        .returnsRow({ id: this.prisma.tables.Block.columns.id })
        .build(),
    );
    const readableIds = await this.blockAccess.findReadableBlockIds(
      rows.map((row) => row.id),
      viewer,
    );
    return readableIds.size > 0;
  }
}
