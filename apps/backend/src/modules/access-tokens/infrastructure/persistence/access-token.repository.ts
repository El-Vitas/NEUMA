import { Injectable } from '@nestjs/common';
import { and, or, PageLifecycle } from '@neuma/db';
import type { AccessTokenAccess, UserRole } from '@neuma/shared';
import { buildSpaceVisibilityFilter } from '../../../../common/infrastructure/persistence/space.visibility.filter';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { NeumaModels } from '../../../../prisma/types/prisma.types';
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
  AccessTokenFilter,
  AccessTokenRepositoryContract,
  NewAccessToken,
} from '../../types/access-token.types';
import {
  readStoredAccessTokens,
  requireRelation,
  toAccessTokenRecord,
  toPageGrantRows,
  toSpaceGrantRows,
  toStoredAccess,
} from './access-token.persistence.adapter';

const liveTokens =
  (now: Date): AccessTokenFilter =>
  (token) =>
    and(or(token.expiresAt.isNull(), token.expiresAt.gt(now)), token.revokedAt.isNull());

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
    const { total } = await this.prisma.models.Space.where((space) => space.id.in([...spaceIds]))
      .where({ workspaceId })
      .where(buildSpaceVisibilityFilter(userId, role))
      .aggregate((aggregate) => ({ total: aggregate.count() }));
    return total;
  }

  async countAccessiblePages(
    pageIds: readonly string[],
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<number> {
    if (pageIds.length === 0) return 0;
    const canSeeSpace = buildSpaceVisibilityFilter(userId, role);
    const { total } = await this.prisma.models.Page.where((page) => page.id.in([...pageIds]))
      .where({ lifecycle: PageLifecycle.ACTIVE })
      .where((page) => page.space.some((space) => and(space.workspaceId.eq(workspaceId), canSeeSpace(space))))
      .aggregate((aggregate) => ({ total: aggregate.count() }));
    return total;
  }

  /** Locks the user's row first so concurrent creations serialize and cannot bypass the limit or name check. */
  async createWithinLimit(
    token: NewAccessToken,
    ownerRole: UserRole,
    limits: AccessTokenCreationLimits,
    now: Date,
  ): Promise<AccessTokenCreation> {
    return this.prisma.transaction(async (transaction) => {
      await transaction.query(
        this.prisma.sql`SELECT "id" FROM "User" WHERE "id" = ${token.userId} FOR UPDATE`
          .returnsRow({ id: this.prisma.tables.User.columns.id })
          .build(),
      );
      const models = transaction.orm.public;
      const live = await models.AccessToken.select('name').where(liveTokens(now)).where({ userId: token.userId }).all();
      if (live.length >= limits.maximumLive) return { kind: 'LIMIT_REACHED' };
      if (limits.isNameTaken(live.map((liveToken) => liveToken.name))) return { kind: 'NAME_TAKEN' };
      const created = await models.AccessToken.select('id').create({
        allSpacesPermissions: [...token.access.allSpaces],
        displayPrefix: token.displayPrefix,
        expiresAt: token.expiresAt,
        name: token.name,
        secretHash: token.secretHash,
        userId: token.userId,
        workspaceId: token.workspaceId,
      });
      await this.createGrants(models, created.id, token.access);
      const stored = await this.readRecord(models, created.id, token.userId, ownerRole);
      return { kind: 'CREATED', token: toAccessTokenRecord(stored) };
    });
  }

  async findBySecretHash(secretHash: string): Promise<AccessTokenWithOwner | null> {
    const found = await this.prisma.models.AccessToken.select(
      'allSpacesPermissions',
      'expiresAt',
      'id',
      'lastUsedAt',
      'revokedAt',
      'workspaceId',
    )
      .include('grants', (grants) => grants.select('permissions', 'spaceId'))
      .include('pageGrants', (pageGrants) => pageGrants.select('pageId', 'permissions'))
      .include('user', (user) => user.select('id', 'isActive', 'role'))
      .where({ secretHash })
      .first();
    if (found === null) return null;
    return {
      access: toStoredAccess(found),
      expiresAt: found.expiresAt,
      id: found.id,
      lastUsedAt: found.lastUsedAt,
      owner: requireRelation(found.user, 'owner of a token'),
      revokedAt: found.revokedAt,
      workspaceId: found.workspaceId,
    };
  }

  async listLive(viewer: AccessTokenOwner, now: Date): Promise<readonly AccessTokenRecord[]> {
    const tokens = await readStoredAccessTokens(this.prisma.models, viewer.userId, viewer.role, (token) =>
      and(liveTokens(now)(token), token.userId.eq(viewer.userId), token.workspaceId.eq(viewer.workspaceId)),
    );
    return tokens.map(toAccessTokenRecord);
  }

  async listLiveInWorkspace(viewer: AccessTokenOwner, now: Date): Promise<readonly AccessTokenWorkspaceRecord[]> {
    const tokens = await readStoredAccessTokens(this.prisma.models, viewer.userId, viewer.role, (token) =>
      and(liveTokens(now)(token), token.workspaceId.eq(viewer.workspaceId)),
    );
    return tokens.map(({ user, ...token }) => ({ ...toAccessTokenRecord(token), owner: user }));
  }

  /** Locks the token row so concurrent replacements cannot interleave. */
  async replaceAccess(
    owner: AccessTokenOwner,
    tokenId: string,
    access: AccessTokenAccess,
    now: Date,
  ): Promise<AccessTokenRecord | null> {
    return this.prisma.transaction(async (transaction) => {
      const held = await transaction.query(
        this.prisma.sql`
          SELECT "id" FROM "AccessToken"
          WHERE "id" = ${tokenId} AND "userId" = ${owner.userId} AND "workspaceId" = ${owner.workspaceId}
            AND "revokedAt" IS NULL
            AND ("expiresAt" IS NULL OR "expiresAt" > ${now.toISOString()}::timestamptz)
          FOR UPDATE
        `
          .returnsRow({ id: this.prisma.tables.AccessToken.columns.id })
          .build(),
      );
      if (held.length === 0) return null;
      const models = transaction.orm.public;
      await models.AccessTokenGrant.where({ tokenId }).deleteAndCount();
      await models.AccessTokenPageGrant.where({ tokenId }).deleteAndCount();
      const updated = await models.AccessToken.where({ id: tokenId }).update({
        allSpacesPermissions: [...access.allSpaces],
      });
      if (updated === null) throw new Error(`The access token ${tokenId} to replace no longer exists`);
      await this.createGrants(models, tokenId, access);
      return toAccessTokenRecord(await this.readRecord(models, tokenId, owner.userId, owner.role));
    });
  }

  async revoke(userId: string, tokenId: string, now: Date): Promise<boolean> {
    const revokedCount = await this.prisma.models.AccessToken.where({ id: tokenId, userId })
      .where((token) => token.revokedAt.isNull())
      .updateAndCount({ revokedAt: now });
    return revokedCount > 0;
  }

  async revokeInWorkspace(workspaceId: string, tokenId: string, now: Date): Promise<boolean> {
    const revokedCount = await this.prisma.models.AccessToken.where({ id: tokenId, workspaceId })
      .where((token) => token.revokedAt.isNull())
      .updateAndCount({ revokedAt: now });
    return revokedCount > 0;
  }

  /** Writes only when the stored value is stale, so calls within the same minute cost one write. */
  async touch(tokenId: string, now: Date): Promise<void> {
    const stale = new Date(now.getTime() - ACCESS_TOKEN_LAST_USED_RESOLUTION_MS);
    await this.prisma.models.AccessToken.where({ id: tokenId })
      .where((token) => or(token.lastUsedAt.isNull(), token.lastUsedAt.lt(stale)))
      .updateAndCount({ lastUsedAt: now });
  }

  private async createGrants(models: NeumaModels, tokenId: string, access: AccessTokenAccess): Promise<void> {
    const spaceGrants = toSpaceGrantRows(access).map((grant) => ({ ...grant, tokenId }));
    if (spaceGrants.length > 0) await models.AccessTokenGrant.createAll(spaceGrants);
    const pageGrants = toPageGrantRows(access).map((grant) => ({ ...grant, tokenId }));
    if (pageGrants.length > 0) await models.AccessTokenPageGrant.createAll(pageGrants);
  }

  private async readRecord(models: NeumaModels, tokenId: string, viewerId: string, viewerRole: UserRole) {
    const [stored] = await readStoredAccessTokens(models, viewerId, viewerRole, (token) => token.id.eq(tokenId));
    if (stored === undefined) throw new Error(`The access token ${tokenId} could not be read back`);
    return stored;
  }
}
