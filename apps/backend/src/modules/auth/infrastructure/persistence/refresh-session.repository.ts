import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { NeumaTransaction } from '@neuma/db';
import { PrismaService } from '../../../../prisma/prisma.service';
import { REFRESH_REPLAY_GRACE_MILLISECONDS } from '../../constants/auth.token.constants';
import { isReplayGraceOpen, isReplaySuccessorUsable } from '../../domain/auth.domain';
import type {
  RefreshRotationOutcome,
  RefreshRotationRequest,
  RefreshSessionRecord,
} from '../../types/refresh.session.types';

@Injectable()
export class RefreshSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async startFamily(userId: string, expiresAt: Date): Promise<RefreshSessionRecord> {
    return this.prisma.models.RefreshSession.create({ expiresAt, familyId: randomUUID(), userId });
  }

  /**
   * Spending the token is one conditional update, so of two requests with the same token only one wins the row;
   * the other waits for the winner's commit, finds the token spent and takes the replay or reuse path.
   */
  async rotate(request: RefreshRotationRequest): Promise<RefreshRotationOutcome> {
    return this.prisma.transaction(async (transaction) => {
      const familyId = await this.spend(transaction, request);
      if (familyId !== null) {
        return { session: await this.issueSuccessor(transaction, familyId, request), status: 'rotated' };
      }
      return this.settleUnspendable(transaction, request);
    });
  }

  async revokeFamily(userId: string, familyId: string): Promise<void> {
    await this.prisma.models.RefreshSession.where({ familyId, userId }).deleteAndCount();
  }

  async deleteExpired(now: Date): Promise<number> {
    return this.prisma.models.RefreshSession.where((row) => row.expiresAt.lt(now)).deleteAndCount();
  }

  /** Returns the family of the spent token, or null when this request did not win the row. */
  private async spend(transaction: NeumaTransaction, request: RefreshRotationRequest): Promise<string | null> {
    const { columns } = this.prisma.tables.RefreshSession;
    const nowIso = request.now.toISOString();
    const rows = await transaction.query(
      this.prisma.sql`
      UPDATE "RefreshSession" SET "usedAt" = ${nowIso}::timestamptz
      WHERE "id" = ${request.tokenId} AND "userId" = ${request.userId}
        AND "usedAt" IS NULL AND "expiresAt" > ${nowIso}::timestamptz
      RETURNING "familyId"
    `
        .returnsRow({ familyId: columns.familyId })
        .build(),
    );
    return rows[0]?.familyId ?? null;
  }

  private async issueSuccessor(
    transaction: NeumaTransaction,
    familyId: string,
    request: RefreshRotationRequest,
  ): Promise<RefreshSessionRecord> {
    const models = transaction.orm.public;
    const successor = await models.RefreshSession.create({
      expiresAt: request.successorExpiresAt,
      familyId,
      userId: request.userId,
    });
    await models.RefreshSession.where({ id: request.tokenId }).update({ replacedById: successor.id });
    return successor;
  }

  private async settleUnspendable(
    transaction: NeumaTransaction,
    request: RefreshRotationRequest,
  ): Promise<RefreshRotationOutcome> {
    const models = transaction.orm.public;
    const presented = await models.RefreshSession.where({ id: request.tokenId, userId: request.userId }).first();
    if (presented === null || presented.expiresAt.getTime() <= request.now.getTime()) {
      return { status: 'unknown' };
    }
    const successor = await this.findSuccessor(transaction, presented);
    const isJustSpent =
      presented.usedAt !== null && isReplayGraceOpen(presented.usedAt, request.now, REFRESH_REPLAY_GRACE_MILLISECONDS);
    if (isJustSpent && isReplaySuccessorUsable(successor, request.now)) {
      return { session: successor, status: 'replayed' };
    }
    await models.RefreshSession.where({ familyId: presented.familyId }).deleteAndCount();
    return { status: 'reused' };
  }

  private async findSuccessor(
    transaction: NeumaTransaction,
    presented: RefreshSessionRecord,
  ): Promise<RefreshSessionRecord | null> {
    if (presented.replacedById === null) return null;
    return transaction.orm.public.RefreshSession.where({ id: presented.replacedById }).first();
  }
}
