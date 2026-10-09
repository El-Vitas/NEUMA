import type { Prisma } from '@company-brain/db/generated';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  SearchProjectionPage,
  SearchProjectionSource as SearchProjectionSourceContract,
} from '../../types/search.types';

const pageSelection = {
  content: true,
  createdById: true,
  icon: true,
  id: true,
  lifecycle: true,
  parentId: true,
  space: { select: { name: true } },
  spaceId: true,
  title: true,
  updatedAt: true,
  verificationExpiresAt: true,
  verifiedAt: true,
  versions: { orderBy: { version: 'desc' as const }, select: { version: true }, take: 1 },
} satisfies Prisma.PageSelect;

@Injectable()
export class SearchProjectionSource implements SearchProjectionSourceContract {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(pageIdentifier: string): Promise<SearchProjectionPage | null> {
    const page = await this.prisma.page.findUnique({ select: pageSelection, where: { id: pageIdentifier } });
    if (page === null) return null;
    const [author, parentPageTitle] = await Promise.all([
      this.prisma.user.findUnique({ select: { name: true }, where: { id: page.createdById } }),
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
    const parent = await this.prisma.page.findUnique({ select: { title: true }, where: { id: parentId } });
    return parent?.title ?? null;
  }
}
