import type { Prisma } from '@company-brain/db/generated';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { OutboxEventContract, OutboxEventInput, OutboxEventRecord } from '../../types/outbox.types';

@Injectable()
export class OutboxRepository implements OutboxEventContract {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: OutboxEventInput, transaction?: Prisma.TransactionClient): Promise<void> {
    const client = transaction ?? this.prisma;
    await client.outboxEvent.create({ data: input });
  }

  async claimPending(limit: number): Promise<readonly OutboxEventRecord[]> {
    const events = await this.prisma.outboxEvent.findMany({
      orderBy: { createdAt: 'asc' },
      take: limit,
      where: { nextAttemptAt: { lte: new Date() }, status: 'PENDING' },
    });
    return events;
  }

  async markProcessed(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      data: { processedAt: new Date(), status: 'PROCESSED' },
      where: { id },
    });
  }
}
