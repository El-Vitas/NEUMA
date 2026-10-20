import { Injectable } from '@nestjs/common';
import { findLatestPageVersions } from '../../../../common/infrastructure/persistence/page-latest-version.lib';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  SearchProjectionPage,
  SearchProjectionSource as SearchProjectionSourceContract,
} from '../../types/search.types';

@Injectable()
export class SearchProjectionSource implements SearchProjectionSourceContract {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(pageIdentifier: string): Promise<SearchProjectionPage | null> {
    const page = await this.prisma.models.Page.where({ id: pageIdentifier })
      .select(
        'content',
        'createdById',
        'icon',
        'id',
        'lifecycle',
        'parentId',
        'spaceId',
        'title',
        'updatedAt',
        'verificationExpiresAt',
        'verifiedAt',
      )
      .include('space', (space) => space.select('name'))
      .first();
    if (page === null || page.space === null) return null;
    const [author, parentPageTitle, versions] = await Promise.all([
      this.prisma.models.User.where({ id: page.createdById }).select('name').first(),
      this.findParentPageTitle(page.parentId),
      findLatestPageVersions(this.prisma, [page.id]),
    ]);
    return {
      ...page,
      authorId: page.createdById,
      authorName: author?.name ?? null,
      parentPageId: page.parentId,
      parentPageTitle,
      spaceName: page.space.name,
      version: versions.get(page.id) ?? 0,
    };
  }

  private async findParentPageTitle(parentId: string | null): Promise<string | null> {
    if (parentId === null) return null;
    const parent = await this.prisma.models.Page.where({ id: parentId }).select('title').first();
    return parent?.title ?? null;
  }
}
