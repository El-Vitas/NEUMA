import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { CollaborationPersistenceAdapter } from '../../types/collaboration.types';

@Injectable()
export class CollaborationRepository implements CollaborationPersistenceAdapter {
  constructor(private readonly prisma: PrismaService) {}

  async load(documentName: string): Promise<Uint8Array | null> {
    const snapshot = await this.prisma.collaborationSnapshot.findUnique({
      select: { state: true },
      where: { documentName },
    });
    return snapshot === null ? null : new Uint8Array(snapshot.state);
  }

  async store(documentName: string, state: Uint8Array): Promise<void> {
    await this.prisma.collaborationSnapshot.upsert({
      create: { documentName, state: Buffer.from(state) },
      update: { state: Buffer.from(state), updateCount: { increment: 1 } },
      where: { documentName },
    });
  }
}
