import { Injectable } from '@nestjs/common';
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
      .include('versions', (versions) =>
        versions
          .select('version')
          .orderBy((version) => version.version.desc())
          .limit(1),
      )
      .first();
    if (page === null || page.space === null) return null;
    const [author, parentPageTitle] = await Promise.all([
      this.prisma.models.User.where({ id: page.createdById }).select('name').first(),
      this.findParentPageTitle(page.parentId),
    ]);
    return {
      ...page,
      authorId: page.createdById,
      authorName: author?.name ?? null,
      parentPageId: page.parentId,
      parentPageTitle,
      spaceName: page.space.name,
      version: page.versions[0]?.version ?? 0,
    };
  }

  private async findParentPageTitle(parentId: string | null): Promise<string | null> {
    if (parentId === null) return null;
    const parent = await this.prisma.models.Page.where({ id: parentId }).select('title').first();
    return parent?.title ?? null;
  }
}
