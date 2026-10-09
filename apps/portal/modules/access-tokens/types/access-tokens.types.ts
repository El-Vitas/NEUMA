import type { AccessTokenLevel, AccessTokenPermission, accessTokenAccessSchema } from '@company-brain/shared';
import type { z } from 'zod';
import type {
  ACCESS_TOKEN_EXPIRY_VALUES,
  ACCESS_TOKEN_PAGE_SEARCH_STATES,
  ACCESS_TOKEN_TARGET_KINDS,
} from '../constants/access-tokens.constants';
import type {
  accessTokenSchema,
  createdAccessTokenSchema,
  workspaceAccessTokenSchema,
} from '../schemas/access-tokens.schemas';

/** Un token tal como lo ve quien mira: sin secreto, y con los lugares que no ve solo contados. */
export type AccessToken = z.infer<typeof accessTokenSchema>;

/** Un token en la lista de quien administra: además, de quién es. */
export type WorkspaceAccessToken = z.infer<typeof workspaceAccessTokenSchema>;

export type CreatedAccessToken = z.infer<typeof createdAccessTokenSchema>;

export type AccessTokenExpiry = (typeof ACCESS_TOKEN_EXPIRY_VALUES)[number];

/** Cuándo vence un token según lo elegido: nunca, en un momento, o falta elegir la fecha. */
export type AccessTokenExpiryResolution =
  | { readonly kind: 'AT'; readonly expiresAt: Date }
  | { readonly kind: 'MISSING' }
  | { readonly kind: 'NEVER' };

/** El acceso tal como se manda al servidor, en la forma que su esquema acepta. */
export type AccessTokenAccessInput = z.input<typeof accessTokenAccessSchema>;

export type AccessTokenTargetKind = (typeof ACCESS_TOKEN_TARGET_KINDS)[keyof typeof ACCESS_TOKEN_TARGET_KINDS];

export type AccessTokenPageSearchState =
  (typeof ACCESS_TOKEN_PAGE_SEARCH_STATES)[keyof typeof ACCESS_TOKEN_PAGE_SEARCH_STATES];

/** Lo que devuelve buscar páginas para un token: las encontradas, si sigue buscando, y si falló. */
export interface AccessTokenPageSearch {
  readonly hasFailed: boolean;
  readonly isSearching: boolean;
  readonly pages: readonly AccessTokenPageOption[];
}

/** Una página que el dueño puede dar, con lo que hace falta para nombrarla. */
export interface AccessTokenPageOption {
  readonly id: string;
  readonly spaceName: string;
  readonly title: string;
}

/**
 * El lugar que nombra una fila: todos los espacios, un espacio, o una página
 * con todo lo que cuelga de ella. Una fila de página puede estar todavía sin
 * página elegida.
 */
export type AccessTokenDraftTarget =
  | { readonly kind: 'ALL' }
  | { readonly kind: 'PAGE'; readonly page: AccessTokenPageOption | null }
  | { readonly kind: 'SPACE'; readonly spaceId: string };

/**
 * Una fila del formulario de acceso: un lugar y lo que se da ahí. El nivel
 * dice los permisos; solo cuando es personalizado cuentan las casillas
 * marcadas a mano. «Sin acceso» excluye el lugar.
 */
export interface AccessTokenDraftRow {
  readonly customPermissions: readonly AccessTokenPermission[];
  readonly key: string;
  readonly level: AccessTokenLevel;
  readonly target: AccessTokenDraftTarget;
}

/** Lo que el formulario de acceso sabe hacer con sus filas. */
export interface AccessTokenDraft {
  readonly addRow: (target: AccessTokenDraftTarget) => void;
  readonly removeRow: (key: string) => void;
  readonly rows: readonly AccessTokenDraftRow[];
  readonly setLevel: (key: string, level: AccessTokenLevel) => void;
  readonly setTarget: (key: string, target: AccessTokenDraftTarget) => void;
  readonly togglePermission: (key: string, permission: AccessTokenPermission) => void;
}

/** Un espacio que el dueño puede dar, para ofrecerlo en el formulario. */
export interface AccessTokenSpaceOption {
  readonly id: string;
  readonly name: string;
}

/** Una opción de un grupo de radios: lo que vale, cómo se llama y, si hace falta, qué significa. */
export interface AccessTokenChoice<TValue extends string> {
  readonly hint?: string;
  readonly isDisabled?: boolean;
  readonly label: string;
  readonly value: TValue;
}

/** Una línea de lo que un token tiene dado: dónde y con qué nivel. */
export interface AccessTokenSummaryLine {
  readonly key: string;
  readonly level: AccessTokenLevel;
  readonly target: AccessTokenSummaryTarget;
}

/** Dónde dice una línea del resumen: en todos, en un espacio, o en una página de un espacio. */
export type AccessTokenSummaryTarget =
  | { readonly kind: 'ALL' }
  | { readonly kind: 'PAGE'; readonly pageTitle: string; readonly spaceName: string }
  | { readonly kind: 'SPACE'; readonly spaceName: string };
