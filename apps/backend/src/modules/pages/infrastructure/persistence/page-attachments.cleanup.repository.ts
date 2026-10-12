import { Injectable } from '@nestjs/common';
import { FileAssetLifecycle } from '@neuma/db';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { PageAssetForExport, PageAttachmentsCleanupRepositoryContract } from '../../types/page.types';

@Injectable()
export class PageAttachmentsCleanupRepository implements PageAttachmentsCleanupRepositoryContract {
  constructor(private readonly prisma: PrismaService) {}

  async listStorageKeysForPages(pageIds: readonly string[]): Promise<readonly string[]> {
    if (pageIds.length === 0) return [];
    const assets = await this.prisma.models.FileAsset.select('storageKey')
      .where((asset) => asset.pageId.in([...pageIds]))
      .all();
    return assets.map((asset) => asset.storageKey);
  }

  async listAssetsForPages(pageIds: readonly string[]): Promise<readonly PageAssetForExport[]> {
    if (pageIds.length === 0) return [];
    return this.prisma.models.FileAsset.select('id', 'originalFilename', 'storageKey')
      .where({ lifecycle: FileAssetLifecycle.ACTIVE })
      .where((asset) => asset.pageId.in([...pageIds]))
      .all();
  }

  async deleteForPages(pageIds: readonly string[]): Promise<void> {
    if (pageIds.length === 0) return;
    await this.prisma.models.FileAsset.where((asset) => asset.pageId.in([...pageIds])).deleteAndCount();
  }
}
