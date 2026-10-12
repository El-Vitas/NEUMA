import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { CollaborationPersistenceAdapter } from '../../types/collaboration.types';

@Injectable()
export class CollaborationRepository implements CollaborationPersistenceAdapter {
  constructor(private readonly prisma: PrismaService) {}

  async load(documentName: string): Promise<Uint8Array | null> {
    const snapshot = await this.prisma.models.CollaborationSnapshot.where({ documentName }).select('state').first();
    return snapshot === null ? null : new Uint8Array(snapshot.state);
  }

  // The update takes the row lock before the counter is bumped, so concurrent stores never lose a count.
  async store(documentName: string, state: Uint8Array): Promise<void> {
    await this.prisma.transaction(async (transaction) => {
      const snapshots = transaction.orm.public.CollaborationSnapshot;
      const createdCount = await snapshots.createAndCount([{ documentName, state: Buffer.from(state) }], {
        onConflict: 'skip',
      });
      if (createdCount > 0) return;
      await snapshots.where({ documentName }).update({ state: Buffer.from(state) });
      const incrementCount = this.prisma
        .sql`UPDATE "CollaborationSnapshot" SET "updateCount" = "updateCount" + 1 WHERE "documentName" = ${documentName}`;
      await transaction.execute(incrementCount.affectedCount().build());
    });
  }
}
