import { type AccessTokenAccess, canManageWorkspace, Result } from '@company-brain/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { AccessTokenPrincipal, AccessTokenPrincipalResolver } from '../../common/types/access-token.types';
import { ACCESS_TOKEN_LIMIT_PER_USER, ACCESS_TOKEN_REPOSITORY } from './constants/access-tokens.constants';
import {
  isAccessTokenUsable,
  listPermissionsBeyondRole,
  validateAccessTokenAccess,
} from './domain/access-token.domain';
import type {
  AccessTokenDraft,
  AccessTokenOwner,
  AccessTokenRecord,
  AccessTokenRefusal,
  AccessTokenWorkspaceRecord,
  CreatedAccessToken,
} from './domain/access-token.domain.types';
import {
  AccessTokenAdminOnlyError,
  AccessTokenExpiryInPastError,
  AccessTokenLimitReachedError,
  AccessTokenNotFoundError,
  AccessTokenPermissionBeyondOwnerError,
  AccessTokenSpaceNotAccessibleError,
} from './domain/access-token.error';
import {
  generateAccessTokenSecret,
  hashAccessTokenSecret,
} from './infrastructure/adapters/access-token.secret.adapter';
import type { AccessTokenRepositoryContract } from './types/access-token.types';
import {
  isLastUseWorthRecording,
  looksLikeAccessTokenSecret,
  readAccessTokenDisplayPrefix,
} from './utils/access-token.utils';

/**
 * Las llaves con las que un agente entra por su dueño.
 *
 * Un token puede lo que tiene dado, espacio por espacio, y nunca más que su
 * dueño: al darlo se revisa que el dueño pueda dar cada permiso y vea cada
 * espacio, y al usarlo se vuelve a mirar lo que el dueño puede hoy. Por eso
 * desactivar a la persona apaga también sus tokens.
 */
@Injectable()
export class AccessTokensService implements AccessTokenPrincipalResolver {
  constructor(@Inject(ACCESS_TOKEN_REPOSITORY) private readonly accessTokenRepository: AccessTokenRepositoryContract) {}

  async createToken(
    owner: AccessTokenOwner,
    draft: AccessTokenDraft,
  ): Promise<
    Result<CreatedAccessToken, AccessTokenRefusal | AccessTokenExpiryInPastError | AccessTokenLimitReachedError>
  > {
    const now = new Date();
    if (draft.expiresAt !== null && draft.expiresAt <= now) return Result.fail(new AccessTokenExpiryInPastError());
    const access = await this.validateGrantableAccess(owner, draft.access);
    if (access.isFail()) return Result.fail(access.getError());

    const secret = generateAccessTokenSecret();
    const token = await this.accessTokenRepository.createWithinLimit(
      {
        access: access.getValue(),
        displayPrefix: readAccessTokenDisplayPrefix(secret),
        expiresAt: draft.expiresAt,
        name: draft.name,
        secretHash: hashAccessTokenSecret(secret),
        userId: owner.userId,
        workspaceId: owner.workspaceId,
      },
      owner.role,
      ACCESS_TOKEN_LIMIT_PER_USER,
      now,
    );
    if (token === null) return Result.fail(new AccessTokenLimitReachedError());
    return Result.ok({ secret, token });
  }

  /** Cambia lo que el token tiene dado, con los mismos límites que al crearlo. La clave no cambia. */
  async updateAccess(
    owner: AccessTokenOwner,
    tokenId: string,
    requested: unknown,
  ): Promise<Result<AccessTokenRecord, AccessTokenRefusal | AccessTokenNotFoundError>> {
    const access = await this.validateGrantableAccess(owner, requested);
    if (access.isFail()) return Result.fail(access.getError());
    const token = await this.accessTokenRepository.replaceAccess(owner, tokenId, access.getValue(), new Date());
    return token === null ? Result.fail(new AccessTokenNotFoundError()) : Result.ok(token);
  }

  async listTokens(owner: AccessTokenOwner): Promise<readonly AccessTokenRecord[]> {
    return this.accessTokenRepository.listLive(owner, new Date());
  }

  async listWorkspaceTokens(
    viewer: AccessTokenOwner,
  ): Promise<Result<readonly AccessTokenWorkspaceRecord[], AccessTokenAdminOnlyError>> {
    if (!canManageWorkspace(viewer.role)) return Result.fail(new AccessTokenAdminOnlyError());
    return Result.ok(await this.accessTokenRepository.listLiveInWorkspace(viewer, new Date()));
  }

  async revokeToken(userId: string, tokenId: string): Promise<Result<void, AccessTokenNotFoundError>> {
    const revoked = await this.accessTokenRepository.revoke(userId, tokenId, new Date());
    return revoked ? Result.ok(undefined) : Result.fail(new AccessTokenNotFoundError());
  }

  async revokeWorkspaceToken(
    viewer: AccessTokenOwner,
    tokenId: string,
  ): Promise<Result<void, AccessTokenAdminOnlyError | AccessTokenNotFoundError>> {
    if (!canManageWorkspace(viewer.role)) return Result.fail(new AccessTokenAdminOnlyError());
    const revoked = await this.accessTokenRepository.revokeInWorkspace(viewer.workspaceId, tokenId, new Date());
    return revoked ? Result.ok(undefined) : Result.fail(new AccessTokenNotFoundError());
  }

  /** En nombre de quién actúa quien presenta este secreto, y con qué, o nadie. Nunca dice por qué no. */
  async resolvePrincipal(secret: string): Promise<AccessTokenPrincipal | null> {
    if (!looksLikeAccessTokenSecret(secret)) return null;

    const token = await this.accessTokenRepository.findBySecretHash(hashAccessTokenSecret(secret));
    const now = new Date();
    if (token === null || !token.owner.isActive || !isAccessTokenUsable(token, now)) return null;

    if (isLastUseWorthRecording(token.lastUsedAt, now)) await this.accessTokenRepository.touch(token.id, now);
    return {
      access: token.access,
      role: token.owner.role,
      tokenId: token.id,
      userId: token.owner.id,
      workspaceId: token.workspaceId,
    };
  }

  /**
   * Lo pedido, si su dueño puede darlo: bien formado, sin permisos que él no
   * tenga, y sin espacios que él no vea.
   */
  private async validateGrantableAccess(
    owner: AccessTokenOwner,
    requested: unknown,
  ): Promise<Result<AccessTokenAccess, AccessTokenRefusal>> {
    const validated = validateAccessTokenAccess(requested);
    if (validated.isFail()) return validated;
    const access = validated.getValue();

    const beyond = listPermissionsBeyondRole(access, owner.role);
    if (beyond.length > 0) return Result.fail(new AccessTokenPermissionBeyondOwnerError(beyond));

    const spaceIds = access.spaces.map((grant) => grant.spaceId);
    const visible = await this.accessTokenRepository.countAccessibleSpaces(
      spaceIds,
      owner.workspaceId,
      owner.userId,
      owner.role,
    );
    return visible === spaceIds.length ? Result.ok(access) : Result.fail(new AccessTokenSpaceNotAccessibleError());
  }
}
