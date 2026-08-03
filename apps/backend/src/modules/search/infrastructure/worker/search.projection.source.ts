import type { Prisma } from '@company-brain/db/generated';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  SearchProjectionPage,
  SearchProjectionRecord,
  SearchProjectionSource as SearchProjectionSourceContract,
} from '../../types/search.types';

const pageSelection = {
  content: true,
  id: true,
  lifecycle: true,
  spaceId: true,
  title: true,
  versions: { orderBy: { version: 'desc' as const }, select: { version: true }, take: 1 },
} satisfies Prisma.PageSelect;

const recordSelection = {
  database: {
    select: {
      lifecycle: true,
      name: true,
      properties: { orderBy: { order: 'asc' as const }, select: { key: true, label: true, type: true } },
      spaceId: true,
      template: true,
    },
  },
  databaseId: true,
  id: true,
  lifecycle: true,
  propertyValues: true,
  title: true,
  updatedAt: true,
} satisfies Prisma.DatabaseRecordSelect;

@Injectable()
export class SearchProjectionSource implements SearchProjectionSourceContract {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(pageIdentifier: string): Promise<SearchProjectionPage | null> {
    const page = await this.prisma.page.findUnique({ select: pageSelection, where: { id: pageIdentifier } });
    if (page === null) return null;
    return { ...page, version: page.versions[0]?.version ?? 0 };
  }

  async findRecord(recordId: string): Promise<SearchProjectionRecord | null> {
    const record = await this.prisma.databaseRecord.findUnique({ select: recordSelection, where: { id: recordId } });
    return record === null ? null : this.toProjectionRecord(record);
  }

  async listRecords(databaseId: string): Promise<readonly SearchProjectionRecord[]> {
    const records = await this.prisma.databaseRecord.findMany({
      select: recordSelection,
      where: { databaseId },
    });
    return records.map((record) => this.toProjectionRecord(record));
  }

  private toProjectionRecord(
    record: Prisma.DatabaseRecordGetPayload<{ select: typeof recordSelection }>,
  ): SearchProjectionRecord {
    return {
      database: record.database,
      databaseId: record.databaseId,
      id: record.id,
      lifecycle: record.lifecycle,
      propertyValues: record.propertyValues,
      title: record.title,
      version: record.updatedAt.getTime(),
    };
  }
}
