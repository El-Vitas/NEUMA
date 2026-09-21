import type { AccessTokenAccess, AccessTokenPermission, UserRole } from '@company-brain/shared';
import type {
  AccessTokenAccessValidationError,
  AccessTokenPermissionBeyondOwnerError,
  AccessTokenSpaceNotAccessibleError,
} from './access-token.error';

/** Por qué no se puede dar lo pedido: mal formado, más de lo que el dueño puede, o un espacio que no ve. */
export type AccessTokenRefusal =
  | AccessTokenAccessValidationError
  | AccessTokenPermissionBeyondOwnerError
  | AccessTokenSpaceNotAccessibleError;

/** Lo que decide si un token todavía abre la puerta. */
export interface AccessTokenValidity {
  readonly expiresAt: Date | null;
  readonly revokedAt: Date | null;
}

/** Lo dado en un espacio, con su nombre para que la lista diga dónde sin otra consulta. */
export interface AccessTokenNamedGrant {
  readonly permissions: readonly AccessTokenPermission[];
  readonly spaceId: string;
  readonly spaceName: string;
}

/**
 * Un token tal como se lista: todo menos el secreto, que ya no existe en ninguna parte.
 *
 * Los accesos con nombre son los de los espacios que ve quien mira; los demás
 * van solo como número, para decir que hay más sin decir dónde.
 */
export interface AccessTokenRecord {
  readonly allSpaces: readonly AccessTokenPermission[];
  readonly createdAt: Date;
  readonly displayPrefix: string;
  readonly expiresAt: Date | null;
  readonly hiddenSpaceCount: number;
  readonly id: string;
  readonly lastUsedAt: Date | null;
  readonly name: string;
  readonly spaces: readonly AccessTokenNamedGrant[];
}

/** Un token en la lista de quien administra: además, de quién es. */
export interface AccessTokenWorkspaceRecord extends AccessTokenRecord {
  readonly owner: { readonly id: string; readonly name: string };
}

/** Un token junto a quien lo creó, que es lo que hace falta para saber en nombre de quién actúa. */
export interface AccessTokenWithOwner extends AccessTokenValidity {
  readonly access: AccessTokenAccess;
  readonly id: string;
  readonly lastUsedAt: Date | null;
  readonly owner: { readonly id: string; readonly isActive: boolean; readonly role: UserRole };
  readonly workspaceId: string;
}

/** Quien crea, cambia o mira tokens: lo que puede dar y ver sale de aquí, no de lo que pide. */
export interface AccessTokenOwner {
  readonly role: UserRole;
  readonly userId: string;
  readonly workspaceId: string;
}

/** Lo que una persona pide al crear un token. El acceso llega sin validar: lo valida el servicio. */
export interface AccessTokenDraft {
  readonly access: unknown;
  readonly expiresAt: Date | null;
  readonly name: string;
}

/** Un token recién hecho: la única vez que su secreto existe fuera de quien lo pidió. */
export interface CreatedAccessToken {
  readonly secret: string;
  readonly token: AccessTokenRecord;
}
