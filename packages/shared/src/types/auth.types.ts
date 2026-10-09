import type { User } from './user.types.js';

/** Only the issuer knows the token lifetimes, so they travel here and each cookie expires with its token. */
export interface AuthSession {
  readonly accessToken: string;
  readonly accessTokenExpiresInSeconds: number;
  readonly refreshToken: string;
  readonly refreshTokenExpiresInSeconds: number;
  readonly user: User;
}
