import { type AccessTokenAccess, canManageWorkspace, isAccessTokenNameTaken, Result } from '@company-brain/shared';
import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import type { AccessTokenPrincipal, AccessTokenPrincipalResolver } from '../../common/types/access-token.types';
import { ACCESS_TOKEN_LIMIT_PER_USER, ACCESS_TOKEN_REPOSITORY } from './constants/access-tokens.constants';
import {
  isAccessTokenUsable,
  listPermissionsBeyondRole,
  validateAccessTokenAccess,
  validateAccessTokenExpiry,
  validateAccessTokenName,
} from './domain/access-token.domain';
import type {
  AccessTokenCreateRefusal,
  AccessTokenCreation,
  AccessTokenDraft,
  AccessTokenOwner,
  AccessTokenRecord,
  AccessTokenRefusal,
  AccessTokenWorkspaceRecord,
  CreatedAccessToken,
} from './domain/access-token.domain.types';
import {
  AccessTokenAdminOnlyError,
  AccessTokenLimitReachedError,
  AccessTokenNameTakenError,
  AccessTokenNotFoundError,
  AccessTokenPageNotAccessibleError,
  AccessTokenPermissionBeyondOwnerError,
  AccessTokenSpaceNotAccessibleError,
} from './domain/access-token.error';
import {
  generateAccessTokenSecret,
  hashAccessTokenSecret,
} from './infrastructure/adapters/access-token.secret.adapter';
import type { AccessTokenLogger, AccessTokenRepositoryContract } from './types/access-token.types';
import {
  describeAccess,
  describeOwner,
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
  constructor(
    @Inject(ACCESS_TOKEN_REPOSITORY) private readonly accessTokenRepository: AccessTokenRepositoryContract,
    @Inject(PinoLogger) private readonly logger: AccessTokenLogger,
  ) {}

  async createToken(
    owner: AccessTokenOwner,
    draft: AccessTokenDraft,
  ): Promise<Result<CreatedAccessToken, AccessTokenCreateRefusal>> {
    const now = new Date();
    const name = validateAccessTokenName(draft.name);
    if (name.isFail()) return Result.fail(name.getError());
    const expiresAt = validateAccessTokenExpiry(draft.expiresAt, now);
    if (expiresAt.isFail()) return Result.fail(expiresAt.getError());
    const access = await this.validateGrantableAccess(owner, draft.access);
    if (access.isFail()) return Result.fail(access.getError());

    const secret = generateAccessTokenSecret();
    const creation = await this.accessTokenRepository.createWithinLimit(
      {
        access: access.getValue(),
        displayPrefix: readAccessTokenDisplayPrefix(secret),
        expiresAt: expiresAt.getValue(),
        name: name.getValue(),
        secretHash: hashAccessTokenSecret(secret),
        userId: owner.userId,
        workspaceId: owner.workspaceId,
      },
      owner.role,
      {
        isNameTaken: (liveNames) => isAccessTokenNameTaken(name.getValue(), liveNames),
        maximumLive: ACCESS_TOKEN_LIMIT_PER_USER,
      },
      now,
    );
    const created = this.readCreation(creation, secret);
    if (created.isOk())
      this.logger.info(
        { ...describeAccess(access.getValue()), ...describeOwner(owner), tokenId: created.getValue().token.id },
        'access token created',
      );
    return created;
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
    if (token === null) return Result.fail(new AccessTokenNotFoundError());
    this.logger.info(
      { ...describeAccess(access.getValue()), ...describeOwner(owner), tokenId },
      'access token access replaced',
    );
    return Result.ok(token);
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
    if (!revoked) return Result.fail(new AccessTokenNotFoundError());
    this.logger.info({ tokenId, userId }, 'access token revoked by its owner');
    return Result.ok(undefined);
  }

  async revokeWorkspaceToken(
    viewer: AccessTokenOwner,
    tokenId: string,
  ): Promise<Result<void, AccessTokenAdminOnlyError | AccessTokenNotFoundError>> {
    if (!canManageWorkspace(viewer.role)) return Result.fail(new AccessTokenAdminOnlyError());
    const revoked = await this.accessTokenRepository.revokeInWorkspace(viewer.workspaceId, tokenId, new Date());
    if (!revoked) return Result.fail(new AccessTokenNotFoundError());
    this.logger.info({ ...describeOwner(viewer), tokenId }, 'access token revoked by a workspace admin');
    return Result.ok(undefined);
  }

  /** En nombre de quién actúa quien presenta este secreto, y con qué, o nadie. Nunca dice por qué no. */
  async resolvePrincipal(secret: string): Promise<AccessTokenPrincipal | null> {
    if (!looksLikeAccessTokenSecret(secret)) return null;

    const token = await this.accessTokenRepository.findBySecretHash(hashAccessTokenSecret(secret));
    const now = new Date();
    if (token === null || !token.owner.isActive || !isAccessTokenUsable(token, now)) return null;

    if (isLastUseWorthRecording(token.lastUsedAt, now)) await this.recordUse(token.id, now);
    return {
      access: token.access,
      role: token.owner.role,
      tokenId: token.id,
      userId: token.owner.id,
      workspaceId: token.workspaceId,
    };
  }

  /**
   * Anota cuándo se usó el token por última vez. Es un dato de consulta, no
   * parte de entrar: si no se puede anotar, se cuenta en el log y quien trajo
   * el token igual entra.
   */
  private async recordUse(tokenId: string, now: Date): Promise<void> {
    try {
      await this.accessTokenRepository.touch(tokenId, now);
    } catch (error) {
      this.logger.error({ err: error, tokenId }, 'could not record the last use of an access token');
    }
  }

  private readCreation(
    creation: AccessTokenCreation,
    secret: string,
  ): Result<CreatedAccessToken, AccessTokenLimitReachedError | AccessTokenNameTakenError> {
    switch (creation.kind) {
      case 'LIMIT_REACHED':
        return Result.fail(new AccessTokenLimitReachedError());
      case 'NAME_TAKEN':
        return Result.fail(new AccessTokenNameTakenError());
      default:
        return Result.ok({ secret, token: creation.token });
    }
  }

  /**
   * Lo pedido, si su dueño puede darlo: bien formado, sin permisos que él no
   * tenga, y sin espacios ni páginas que él no vea. Vale igual para una regla
   * que da y para una que excluye: tampoco se puede nombrar, ni para cerrarlo,
   * un lugar que no se ve, porque confirmaría que existe.
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

    const [areSpacesVisible, arePagesVisible] = await Promise.all([
      this.areAllSpacesVisible(owner, access),
      this.areAllPagesVisible(owner, access),
    ]);
    if (!areSpacesVisible) return Result.fail(new AccessTokenSpaceNotAccessibleError());
    if (!arePagesVisible) return Result.fail(new AccessTokenPageNotAccessibleError());
    return Result.ok(access);
  }

  private async areAllSpacesVisible(owner: AccessTokenOwner, access: AccessTokenAccess): Promise<boolean> {
    const spaceIds = access.spaces.map((grant) => grant.spaceId);
    const visible = await this.accessTokenRepository.countAccessibleSpaces(
      spaceIds,
      owner.workspaceId,
      owner.userId,
      owner.role,
    );
    return visible === spaceIds.length;
  }

  private async areAllPagesVisible(owner: AccessTokenOwner, access: AccessTokenAccess): Promise<boolean> {
    const pageIds = access.pages.map((grant) => grant.pageId);
    const visible = await this.accessTokenRepository.countAccessiblePages(
      pageIds,
      owner.workspaceId,
      owner.userId,
      owner.role,
    );
    return visible === pageIds.length;
  }
}
