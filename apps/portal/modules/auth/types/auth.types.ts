import type { AuthSession } from '@neuma/shared';
import type { z } from 'zod';
import type { loginSchema, userRoleSchema } from '../schemas/auth.schemas';

export type { AuthSession, User } from '@neuma/shared';

export type RefreshOutcome =
  | { readonly status: 'renewed'; readonly session: AuthSession }
  | { readonly status: 'rejected' }
  | { readonly status: 'unavailable' };

export type SignInAgainOutcome = { readonly status: 'signedIn' } | { readonly status: 'signInRequired' };

export type UserRole = z.infer<typeof userRoleSchema>;

export type LoginInput = z.infer<typeof loginSchema>;
