import { FileAssetLifecycle, PageLifecycle } from '@company-brain/db';
import type { Prisma } from '@company-brain/db/generated';
import { USER_ROLE, type UserRole } from '@company-brain/shared';
import { Injectable } from '@nestjs/common';
import { buildSpaceVisibilityFilter } from '../../../../common/infrastructure/persistence/space.visibility.filter';
import { PrismaService } from '../../../../prisma/prisma.service';
import { FILE_ASSET_METADATA_SELECTION, UNKNOWN_FILE_OWNER_NAME } from '../../constants/files.constants';
import type { FileAssetMetadata, FileAssetSummary } from '../../domain/files.domain.types';
import type { FileAssetMetadataRow, FileAssetRepository } from '../../types/files.types';

const fileAssetSelection = {
  checksum: true,
  deletedAt: true,
  id: true,
  lifecycle: true,
  mimeType: true,
  originalFilename: true,
  ownerId: true,
  pageId: true,
  size: true,
  storageKey: true,
  workspaceId: true,
} satisfies Prisma.FileAssetSelect;

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
    return this.prisma.fileAsset.create({ data: input, select: fileAssetSelection });
  }

  async findAccessible(
    assetId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<FileAssetSummary | null> {
    const asset = await this.prisma.fileAsset.findFirst({
      select: fileAssetSelection,
      where: { id: assetId, lifecycle: FileAssetLifecycle.ACTIVE, workspaceId },
    });
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
    const assets = await this.prisma.fileAsset.findMany({
      select: FILE_ASSET_METADATA_SELECTION,
      where: { lifecycle: FileAssetLifecycle.ACTIVE, pageId, workspaceId },
    });
    return this.withUploaderNames(assets);
  }

  async markDeleted(assetId: string, workspaceId: string, _userId: string): Promise<boolean> {
    const result = await this.prisma.fileAsset.updateMany({
      data: { deletedAt: new Date(), lifecycle: FileAssetLifecycle.DELETED },
      where: { id: assetId, lifecycle: FileAssetLifecycle.ACTIVE, workspaceId },
    });
    return result.count > 0;
  }

  private async withUploaderNames(assets: FileAssetMetadataRow[]): Promise<FileAssetMetadata[]> {
    const ownerIds = [...new Set(assets.map((asset) => asset.ownerId))];
    const owners = await this.prisma.user.findMany({
      select: { id: true, name: true },
      where: { id: { in: ownerIds } },
    });
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
    const page = await this.prisma.page.findFirst({
      select: { id: true },
      where: {
        id: pageId,
        lifecycle: PageLifecycle.ACTIVE,
        space: { workspaceId, ...buildSpaceVisibilityFilter(userId, role) },
      },
    });
    return page !== null;
  }
}
