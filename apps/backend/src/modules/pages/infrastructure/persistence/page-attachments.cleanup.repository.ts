import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { PageAttachmentsCleanupRepositoryContract } from '../../types/page.types';

@Injectable()
export class PageAttachmentsCleanupRepository implements PageAttachmentsCleanupRepositoryContract {
  constructor(private readonly prisma: PrismaService) {}

  async listStorageKeysForPages(pageIds: readonly string[]): Promise<readonly string[]> {
    if (pageIds.length === 0) return [];
    const assets = await this.prisma.fileAsset.findMany({
      select: { storageKey: true },
      where: { pageId: { in: [...pageIds] } },
    });
    return assets.map((asset) => asset.storageKey);
  }

  async deleteForPages(pageIds: readonly string[]): Promise<void> {
    if (pageIds.length === 0) return;
    await this.prisma.fileAsset.deleteMany({ where: { pageId: { in: [...pageIds] } } });
  }
}
