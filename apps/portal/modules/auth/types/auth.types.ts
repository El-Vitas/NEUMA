import type { z } from 'zod';
import type { loginSchema, registerSchema, userRoleSchema } from '../schemas/auth.schemas';

export type { AuthSession, User } from '@neuma/shared';

export type UserRole = z.infer<typeof userRoleSchema>;

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
