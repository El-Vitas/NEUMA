import { Injectable } from '@nestjs/common';
import { PageLifecycle } from '@neuma/db';
import type { AccessTokenAccess, UserRole } from '@neuma/shared';
import { buildSpaceVisibilityFilter } from '../../../../common/infrastructure/persistence/space.visibility.filter';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ACCESS_TOKEN_LAST_USED_RESOLUTION_MS } from '../../constants/access-tokens.constants';
import type {
  AccessTokenCreation,
  AccessTokenOwner,
  AccessTokenRecord,
  AccessTokenWithOwner,
  AccessTokenWorkspaceRecord,
} from '../../domain/access-token.domain.types';
import type {
  AccessTokenCreationLimits,
  AccessTokenRepositoryContract,
  NewAccessToken,
} from '../../types/access-token.types';
import {
  accessTokenRecordSelectFor,
  toAccessTokenRecord,
  toPageGrantRows,
  toSpaceGrantRows,
  toStoredAccess,
} from './access-token.persistence.adapter';

const liveTokens = (now: Date) => ({
  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  revokedAt: null,
});

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

  async countAccessiblePages(
    pageIds: readonly string[],
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<number> {
    if (pageIds.length === 0) return 0;
    return this.prisma.page.count({
      where: {
        id: { in: [...pageIds] },
        lifecycle: PageLifecycle.ACTIVE,
        space: { workspaceId, ...buildSpaceVisibilityFilter(userId, role) },
      },
    });
  }

  /** Locks the user's row first so concurrent creations serialize and cannot bypass the limit or name check. */
  async createWithinLimit(
    token: NewAccessToken,
    ownerRole: UserRole,
    limits: AccessTokenCreationLimits,
    now: Date,
  ): Promise<AccessTokenCreation> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${token.userId} FOR UPDATE`;
      const live = await transaction.accessToken.findMany({
        select: { name: true },
        where: { ...liveTokens(now), userId: token.userId },
      });
      if (live.length >= limits.maximumLive) return { kind: 'LIMIT_REACHED' };
      if (limits.isNameTaken(live.map((liveToken) => liveToken.name))) return { kind: 'NAME_TAKEN' };
      const created = await transaction.accessToken.create({
        data: {
          allSpacesPermissions: [...token.access.allSpaces],
          displayPrefix: token.displayPrefix,
          expiresAt: token.expiresAt,
          grants: { create: toSpaceGrantRows(token.access) },
          name: token.name,
          pageGrants: { create: toPageGrantRows(token.access) },
          secretHash: token.secretHash,
          userId: token.userId,
          workspaceId: token.workspaceId,
        },
        select: accessTokenRecordSelectFor(token.userId, ownerRole),
      });
      return { kind: 'CREATED', token: toAccessTokenRecord(created) };
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
        pageGrants: { select: { pageId: true, permissions: true } },
        revokedAt: true,
        user: { select: { id: true, isActive: true, role: true } },
        workspaceId: true,
      },
      where: { secretHash },
    });
    if (found === null) return null;
    return {
      access: toStoredAccess(found),
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

  /** Locks the token row so concurrent replacements cannot interleave. */
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
      await transaction.accessTokenPageGrant.deleteMany({ where: { tokenId } });
      const updated = await transaction.accessToken.update({
        data: {
          allSpacesPermissions: [...access.allSpaces],
          grants: { create: toSpaceGrantRows(access) },
          pageGrants: { create: toPageGrantRows(access) },
        },
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

  /** Writes only when the stored value is stale, so calls within the same minute cost one write. */
  async touch(tokenId: string, now: Date): Promise<void> {
    const stale = new Date(now.getTime() - ACCESS_TOKEN_LAST_USED_RESOLUTION_MS);
    await this.prisma.accessToken.updateMany({
      data: { lastUsedAt: now },
      where: { id: tokenId, OR: [{ lastUsedAt: null }, { lastUsedAt: { lt: stale } }] },
    });
  }
}
