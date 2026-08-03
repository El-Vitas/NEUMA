import { DatabaseLifecycle, FileAssetLifecycle, PageLifecycle, SpaceVisibility } from '@company-brain/db';
import type { Prisma } from '@company-brain/db/generated';
import { USER_ROLE, type UserRole } from '@company-brain/shared';
import { Injectable } from '@nestjs/common';
import { canReadSpace } from '../../../../common/domain/workspace.policy';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { FileAssetRepository, FileAssetSummary } from '../../types/files.types';

const prismaOrOperator = 'OR';

const fileAssetSelection = {
  checksum: true,
  databaseRecordId: true,
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
    databaseRecordId: string | null,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<boolean> {
    if ((pageId === null) === (databaseRecordId === null) || role === USER_ROLE.CLIENT) return false;
    if (pageId !== null) return this.hasPageAccess(pageId, workspaceId, userId, role);
    if (databaseRecordId === null) return false;
    return this.hasDatabaseRecordAccess(databaseRecordId, workspaceId, userId, role);
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
    if (asset.databaseRecordId !== null)
      return (await this.hasDatabaseRecordAccess(asset.databaseRecordId, workspaceId, userId, role)) ? asset : null;
    return asset.ownerId === userId || role !== USER_ROLE.CLIENT ? asset : null;
  }

  async markDeleted(assetId: string, workspaceId: string, _userId: string): Promise<boolean> {
    const result = await this.prisma.fileAsset.updateMany({
      data: { deletedAt: new Date(), lifecycle: FileAssetLifecycle.DELETED },
      where: { id: assetId, lifecycle: FileAssetLifecycle.ACTIVE, workspaceId },
    });
    return result.count > 0;
  }

  private async hasPageAccess(pageId: string, workspaceId: string, userId: string, role: UserRole): Promise<boolean> {
    const page = await this.prisma.page.findFirst({
      select: { id: true },
      where: {
        id: pageId,
        lifecycle: PageLifecycle.ACTIVE,
        space: { workspaceId, ...this.spaceAccessFilter(userId, role) },
      },
    });
    return page !== null;
  }

  private async hasDatabaseRecordAccess(
    databaseRecordId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<boolean> {
    const record = await this.prisma.databaseRecord.findFirst({
      select: { id: true },
      where: {
        id: databaseRecordId,
        lifecycle: DatabaseLifecycle.ACTIVE,
        database: {
          lifecycle: DatabaseLifecycle.ACTIVE,
          space: { workspaceId, ...this.spaceAccessFilter(userId, role) },
        },
      },
    });
    return record !== null;
  }

  private spaceAccessFilter(userId: string, role: UserRole): Prisma.SpaceWhereInput {
    return {
      [prismaOrOperator]: [
        { visibility: SpaceVisibility.PUBLIC_INTERNAL },
        ...(canReadSpace(role, SpaceVisibility.RESTRICTED, false)
          ? [{ visibility: SpaceVisibility.RESTRICTED }]
          : [{ members: { some: { userId } }, visibility: SpaceVisibility.RESTRICTED }]),
      ],
    };
  }
}
