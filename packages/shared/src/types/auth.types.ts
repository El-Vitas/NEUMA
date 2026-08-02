import type { User } from './user.types.js';

export interface AuthSession {
  readonly accessToken: string;
  readonly user: User;
}
