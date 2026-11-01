import { EMAIL_MAX_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, USER_ROLE_VALUES } from '@neuma/shared';
import { z } from 'zod';

export const userRoleSchema = z.enum(USER_ROLE_VALUES);

export const userSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string(),
  role: userRoleSchema,
});

export const authSessionSchema = z.object({
  accessToken: z.string(),
  accessTokenExpiresInSeconds: z.number().int().positive(),
  refreshToken: z.string(),
  refreshTokenExpiresInSeconds: z.number().int().positive(),
  user: userSchema,
});

export const loginSchema = z.object({
  email: z.email('validation.invalidEmail').max(EMAIL_MAX_LENGTH, 'validation.emailTooLong'),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, 'validation.passwordTooShort')
    .max(PASSWORD_MAX_LENGTH, 'validation.passwordTooLong'),
});
