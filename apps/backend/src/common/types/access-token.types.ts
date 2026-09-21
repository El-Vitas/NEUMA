import type { AccessTokenAccess, UserRole } from '@company-brain/shared';
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
