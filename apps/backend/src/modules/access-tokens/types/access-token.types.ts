import type { AccessTokenAccess, UserRole } from '@company-brain/shared';
import type {
  AccessTokenOwner,
  AccessTokenRecord,
  AccessTokenWithOwner,
  AccessTokenWorkspaceRecord,
} from '../domain/access-token.domain.types';

/** Un token tal como sale de la base, antes de volver a validar sus permisos. */
export interface StoredAccessToken {
  readonly _count: { readonly grants: number };
  readonly allSpacesPermissions: readonly string[];
  readonly createdAt: Date;
  readonly displayPrefix: string;
  readonly expiresAt: Date | null;
  readonly grants: readonly {
    readonly permissions: readonly string[];
    readonly space: { readonly id: string; readonly name: string };
  }[];
  readonly id: string;
  readonly lastUsedAt: Date | null;
  readonly name: string;
}

export interface NewAccessToken {
  readonly access: AccessTokenAccess;
  readonly displayPrefix: string;
  readonly expiresAt: Date | null;
  readonly name: string;
  readonly secretHash: string;
  readonly userId: string;
  readonly workspaceId: string;
}

export interface AccessTokenRepositoryContract {
  /** Cuántos de estos espacios ve la persona. Si son menos que los pedidos, pidió alguno que no ve. */
  readonly countAccessibleSpaces: (
    spaceIds: readonly string[],
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<number>;
  /**
   * Guarda el token con lo que tiene dado, solo si la persona no llegó a su
   * tope, y contesta nada si llegó. Contar y guardar van juntos: contar primero
   * y guardar después deja pasar dos creaciones seguidas por el mismo hueco.
   */
  readonly createWithinLimit: (
    token: NewAccessToken,
    ownerRole: UserRole,
    limit: number,
    now: Date,
  ) => Promise<AccessTokenRecord | null>;
  readonly findBySecretHash: (secretHash: string) => Promise<AccessTokenWithOwner | null>;
  /** Los tokens vivos de quien mira, con los accesos que su propia visibilidad deja nombrar. */
  readonly listLive: (viewer: AccessTokenOwner, now: Date) => Promise<readonly AccessTokenRecord[]>;
  /** Los de todo el espacio de trabajo, con los accesos que la visibilidad de quien administra deja nombrar. */
  readonly listLiveInWorkspace: (viewer: AccessTokenOwner, now: Date) => Promise<readonly AccessTokenWorkspaceRecord[]>;
  /** Cambia lo que el token tiene dado, solo si es de esa persona y sigue vivo. Contesta el token cambiado. */
  readonly replaceAccess: (
    owner: AccessTokenOwner,
    tokenId: string,
    access: AccessTokenAccess,
    now: Date,
  ) => Promise<AccessTokenRecord | null>;
  /** Solo entre los tokens de esa persona: contesta si había uno que revocar. */
  readonly revoke: (userId: string, tokenId: string, now: Date) => Promise<boolean>;
  /** Entre todos los del espacio de trabajo, para quien lo administra. */
  readonly revokeInWorkspace: (workspaceId: string, tokenId: string, now: Date) => Promise<boolean>;
  readonly touch: (tokenId: string, now: Date) => Promise<void>;
}
