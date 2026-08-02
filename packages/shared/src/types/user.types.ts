import type { UserRole } from './user-role.types.js';

export type { UserRole } from './user-role.types.js';

export interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: UserRole;
}
