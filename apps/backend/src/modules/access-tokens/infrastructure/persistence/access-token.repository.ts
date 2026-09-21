import type { AccessTokenAccess, UserRole } from '@company-brain/shared';
import { Injectable } from '@nestjs/common';
import { buildSpaceVisibilityFilter } from '../../../../common/infrastructure/persistence/space.visibility.filter';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  AccessTokenOwner,
  AccessTokenRecord,
  AccessTokenWithOwner,
  AccessTokenWorkspaceRecord,
} from '../../domain/access-token.domain.types';
import type { AccessTokenRepositoryContract, NewAccessToken } from '../../types/access-token.types';
import {
  accessTokenRecordSelectFor,
  readStoredPermissions,
  toAccessTokenRecord,
} from './access-token.persistence.adapter';

/** Vivo es sin revocar y sin vencer: lo que todavía abre la puerta y cuenta para el tope. */
const liveTokens = (now: Date) => ({
  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  revokedAt: null,
});

const toGrantRows = (access: AccessTokenAccess) =>
  access.spaces.map((grant) => ({ permissions: [...grant.permissions], spaceId: grant.spaceId }));

@Injectable()
export class AccessTokenRepository implements AccessTokenRepositoryContract {
  constructor(private readonly prisma: PrismaService) {}

  async countAccessibleSpaces(
    spaceIds: readonly string[],
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<number> {
    if (spaceIds.length === 0) return 0;
    return this.prisma.space.count({
      where: { id: { in: [...spaceIds] }, workspaceId, ...buildSpaceVisibilityFilter(userId, role) },
    });
  }

  /**
   * Toma la fila de la persona antes de contar, así dos creaciones a la vez se
   * ponen en fila y la segunda ve el token de la primera. El token y lo que
   * tiene dado se guardan juntos: un token a medio dar no existe.
   */
  async createWithinLimit(
    token: NewAccessToken,
    ownerRole: UserRole,
    limit: number,
    now: Date,
  ): Promise<AccessTokenRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${token.userId} FOR UPDATE`;
      const live = await transaction.accessToken.count({ where: { ...liveTokens(now), userId: token.userId } });
      if (live >= limit) return null;
      const created = await transaction.accessToken.create({
        data: {
          allSpacesPermissions: [...token.access.allSpaces],
          displayPrefix: token.displayPrefix,
          expiresAt: token.expiresAt,
          grants: { create: toGrantRows(token.access) },
          name: token.name,
          secretHash: token.secretHash,
          userId: token.userId,
          workspaceId: token.workspaceId,
        },
        select: accessTokenRecordSelectFor(token.userId, ownerRole),
      });
      return toAccessTokenRecord(created);
    });
  }

  async findBySecretHash(secretHash: string): Promise<AccessTokenWithOwner | null> {
    const found = await this.prisma.accessToken.findUnique({
      select: {
        allSpacesPermissions: true,
        expiresAt: true,
        grants: { select: { permissions: true, spaceId: true } },
        id: true,
        lastUsedAt: true,
        revokedAt: true,
        user: { select: { id: true, isActive: true, role: true } },
        workspaceId: true,
      },
      where: { secretHash },
    });
    if (found === null) return null;
    return {
      access: {
        allSpaces: readStoredPermissions(found.allSpacesPermissions),
        spaces: found.grants.map((grant) => ({
          permissions: readStoredPermissions(grant.permissions),
          spaceId: grant.spaceId,
        })),
      },
      expiresAt: found.expiresAt,
      id: found.id,
      lastUsedAt: found.lastUsedAt,
      owner: found.user,
      revokedAt: found.revokedAt,
      workspaceId: found.workspaceId,
    };
  }

  async listLive(viewer: AccessTokenOwner, now: Date): Promise<readonly AccessTokenRecord[]> {
    const tokens = await this.prisma.accessToken.findMany({
      orderBy: { createdAt: 'desc' },
      select: accessTokenRecordSelectFor(viewer.userId, viewer.role),
      where: { ...liveTokens(now), userId: viewer.userId, workspaceId: viewer.workspaceId },
    });
    return tokens.map(toAccessTokenRecord);
  }

  async listLiveInWorkspace(viewer: AccessTokenOwner, now: Date): Promise<readonly AccessTokenWorkspaceRecord[]> {
    const tokens = await this.prisma.accessToken.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        ...accessTokenRecordSelectFor(viewer.userId, viewer.role),
        user: { select: { id: true, name: true } },
      },
      where: { ...liveTokens(now), workspaceId: viewer.workspaceId },
    });
    return tokens.map(({ user, ...token }) => ({ ...toAccessTokenRecord(token), owner: user }));
  }

  /**
   * Reemplaza lo dado de una sola vez. Toma la fila del token, así dos cambios
   * seguidos no se mezclan y lo que queda es el último entero.
   */
  async replaceAccess(
    owner: AccessTokenOwner,
    tokenId: string,
    access: AccessTokenAccess,
    now: Date,
  ): Promise<AccessTokenRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const held = await transaction.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "AccessToken"
        WHERE "id" = ${tokenId} AND "userId" = ${owner.userId} AND "workspaceId" = ${owner.workspaceId}
          AND "revokedAt" IS NULL
          AND ("expiresAt" IS NULL OR "expiresAt" > ${now})
        FOR UPDATE
      `;
      if (held.length === 0) return null;
      await transaction.accessTokenGrant.deleteMany({ where: { tokenId } });
      const updated = await transaction.accessToken.update({
        data: { allSpacesPermissions: [...access.allSpaces], grants: { create: toGrantRows(access) } },
        select: accessTokenRecordSelectFor(owner.userId, owner.role),
        where: { id: tokenId },
      });
      return toAccessTokenRecord(updated);
    });
  }

  async revoke(userId: string, tokenId: string, now: Date): Promise<boolean> {
    const revoked = await this.prisma.accessToken.updateMany({
      data: { revokedAt: now },
      where: { id: tokenId, revokedAt: null, userId },
    });
    return revoked.count > 0;
  }

  async revokeInWorkspace(workspaceId: string, tokenId: string, now: Date): Promise<boolean> {
    const revoked = await this.prisma.accessToken.updateMany({
      data: { revokedAt: now },
      where: { id: tokenId, revokedAt: null, workspaceId },
    });
    return revoked.count > 0;
  }

  async touch(tokenId: string, now: Date): Promise<void> {
    await this.prisma.accessToken.update({ data: { lastUsedAt: now }, where: { id: tokenId } });
  }
}
