import type { AccessTokenAccess, AccessTokenPlace, UserRole } from '@company-brain/shared';
import type { FastifyRequest } from 'fastify';

/**
 * Quién actúa cuando entra un token, con cuál entró y qué tiene dado.
 *
 * El rol es el de su dueño hoy, no el que tenía al crearlo: lo que el token
 * puede hacer es lo que tiene dado y además su dueño todavía puede.
 */
export interface AccessTokenPrincipal {
  readonly access: AccessTokenAccess;
  readonly role: UserRole;
  readonly tokenId: string;
  readonly userId: string;
  readonly workspaceId: string;
}

/**
 * Lo único que las puertas de los agentes necesitan saber de los tokens: de quién es uno.
 * Lo contesta el módulo de tokens, y quien lo pregunta no tiene que conocerlo.
 */
export interface AccessTokenPrincipalResolver {
  readonly resolvePrincipal: (secret: string) => Promise<AccessTokenPrincipal | null>;
}

export type AccessTokenRequest = FastifyRequest & { accessTokenPrincipal?: AccessTokenPrincipal };

/** Una regla de página y si deja hacer lo que se está preguntando, para bajarla por su árbol. */
export interface AccessTokenPageRuleProbe {
  readonly allows: boolean;
  readonly pageId: string;
}

/**
 * Las páginas que deciden las reglas de página de un token, con el árbol de
 * hoy: las que su regla más cercana deja, las que su regla más cercana cierra,
 * y los espacios donde queda alguna abierta. Las que no aparecen las decide la
 * regla de su espacio, o la de todos.
 */
export interface AccessTokenPageReach {
  readonly allowedPageIds: readonly string[];
  readonly closedPageIds: readonly string[];
  readonly spaceIdsWithAllowedPages: readonly string[];
}

/** Una página de la cadena que sube desde una página hasta la raíz de su espacio. */
export interface AccessTokenLineageRow {
  readonly id: string;
  readonly spaceId: string;
}

/** Una página alcanzada por una regla de página, con lo que dice su regla más cercana. */
export interface AccessTokenReachRow {
  readonly allows: boolean;
  readonly id: string;
  readonly spaceId: string;
}

/** Dónde está cada cosa en el árbol de páginas, preguntado en el momento de decidir. */
export interface AccessTokenPlaceReader {
  /** La página con sus ancestros, de la más cercana a la raíz, o nada si no es de ese espacio de trabajo. */
  readonly readPlace: (pageId: string, workspaceId: string) => Promise<AccessTokenPlace | null>;
  readonly resolvePageReach: (
    rules: readonly AccessTokenPageRuleProbe[],
    workspaceId: string,
  ) => Promise<AccessTokenPageReach>;
}
