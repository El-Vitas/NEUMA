import type { User } from './user.types.js';

/**
 * What a signed-in session is made of.
 *
 * The lifetimes travel with the session because whoever issues the tokens is
 * the only one who knows how long they last: the browser stores each cookie
 * for exactly that long, so a cookie can never outlive what it carries.
 */
export interface AuthSession {
  readonly accessToken: string;
  readonly accessTokenExpiresInSeconds: number;
  readonly refreshToken: string;
  readonly refreshTokenExpiresInSeconds: number;
  readonly user: User;
}
