import { Injectable } from '@nestjs/common';
import type { Prisma } from '@neuma/db/generated';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  LinksProjectionPage,
  LinksProjectionSource as LinksProjectionSourceContract,
} from '../../types/links.types';

const pageSelection = {
  content: true,
  id: true,
  lifecycle: true,
} satisfies Prisma.PageSelect;

@Injectable()
export class LinksProjectionSource implements LinksProjectionSourceContract {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(pageId: string): Promise<LinksProjectionPage | null> {
    return this.prisma.page.findUnique({ select: pageSelection, where: { id: pageId } });
  }
}
