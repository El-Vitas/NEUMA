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
  id: true,
  lifecycle: true,
  spaceId: true,
  title: true,
  versions: { orderBy: { version: 'desc' as const }, select: { version: true }, take: 1 },
} satisfies Prisma.PageSelect;

@Injectable()
export class SearchProjectionSource implements SearchProjectionSourceContract {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(pageIdentifier: string): Promise<SearchProjectionPage | null> {
    const page = await this.prisma.page.findUnique({ select: pageSelection, where: { id: pageIdentifier } });
    if (page === null) return null;
    const author = await this.prisma.user.findUnique({ select: { name: true }, where: { id: page.createdById } });
    return {
      ...page,
      authorId: page.createdById,
      authorName: author?.name ?? null,
      version: page.versions[0]?.version ?? 0,
    };
  }
}
