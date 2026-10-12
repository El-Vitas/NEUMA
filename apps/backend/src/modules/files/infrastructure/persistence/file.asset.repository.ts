import { Injectable } from '@nestjs/common';
import { and, FileAssetLifecycle, PageLifecycle } from '@neuma/db';
import { USER_ROLE, type UserRole } from '@neuma/shared';
import { buildSpaceVisibilityFilter } from '../../../../common/infrastructure/persistence/space.visibility.filter';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  FILE_ASSET_FIELDS,
  FILE_ASSET_METADATA_FIELDS,
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
  constructor(private readonly prisma: PrismaService) {}

  async canAttachToContent(
    pageId: string | null,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<boolean> {
    if (pageId === null || role === USER_ROLE.CLIENT) return false;
    return this.hasPageAccess(pageId, workspaceId, userId, role);
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
    if (asset.pageId !== null)
      return (await this.hasPageAccess(asset.pageId, workspaceId, userId, role)) ? asset : null;
    return asset.ownerId === userId || role !== USER_ROLE.CLIENT ? asset : null;
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
    const isVisibleSpace = buildSpaceVisibilityFilter(userId, role);
    const page = await this.prisma.models.Page.where({ id: pageId, lifecycle: PageLifecycle.ACTIVE })
      .where((candidate) =>
        candidate.space.some((space) => and(space.workspaceId.eq(workspaceId), isVisibleSpace(space))),
      )
      .select('id')
      .first();
    return page !== null;
  }
}
