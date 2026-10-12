import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  LinksProjectionPage,
  LinksProjectionSource as LinksProjectionSourceContract,
} from '../../types/links.types';

@Injectable()
export class LinksProjectionSource implements LinksProjectionSourceContract {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(pageId: string): Promise<LinksProjectionPage | null> {
    return this.prisma.models.Page.where({ id: pageId }).select('content', 'id', 'lifecycle').first();
  }
}
