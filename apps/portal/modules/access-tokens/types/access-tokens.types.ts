import type { AccessTokenLevel, AccessTokenPermission } from '@company-brain/shared';
import type { z } from 'zod';
import type { ACCESS_TOKEN_EXPIRY_VALUES } from '../constants/access-tokens.constants';
import type {
  accessTokenSchema,
  createdAccessTokenSchema,
  workspaceAccessTokenSchema,
} from '../schemas/access-tokens.schemas';

/** Un token tal como lo ve quien mira: sin secreto, y con los espacios que no ve solo contados. */
export type AccessToken = z.infer<typeof accessTokenSchema>;

/** Un token en la lista de quien administra: además, de quién es. */
export type WorkspaceAccessToken = z.infer<typeof workspaceAccessTokenSchema>;

export type CreatedAccessToken = z.infer<typeof createdAccessTokenSchema>;

export type AccessTokenExpiry = (typeof ACCESS_TOKEN_EXPIRY_VALUES)[number];

/**
 * Una fila del formulario de acceso: un lugar y lo que se da ahí.
 *
 * El lugar es un espacio o «todos los espacios». El nivel dice los permisos;
 * solo cuando es personalizado cuentan las casillas marcadas a mano.
 */
export interface AccessTokenDraftRow {
  readonly customPermissions: readonly AccessTokenPermission[];
  readonly key: string;
  readonly level: AccessTokenLevel;
  readonly target: string;
}

/** Lo que el formulario de acceso sabe hacer con sus filas. */
export interface AccessTokenDraft {
  readonly addRow: (target: string) => void;
  readonly removeRow: (key: string) => void;
  readonly rows: readonly AccessTokenDraftRow[];
  readonly setLevel: (key: string, level: AccessTokenLevel) => void;
  readonly setTarget: (key: string, target: string) => void;
  readonly togglePermission: (key: string, permission: AccessTokenPermission) => void;
}

/** Un espacio que el dueño puede dar, para ofrecerlo en el formulario. */
export interface AccessTokenSpaceOption {
  readonly id: string;
  readonly name: string;
}
