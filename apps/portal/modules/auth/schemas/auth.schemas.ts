import { z } from 'zod';

export const userRoleSchema = z.union([z.literal('ADMIN'), z.literal('WORKER'), z.literal('CLIENT')]);

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
  email: z.email('validation.invalidEmail').max(255, 'validation.emailTooLong'),
  password: z.string().min(8, 'validation.passwordTooShort').max(100, 'validation.passwordTooLong'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'validation.nameTooShort').max(100, 'validation.nameTooLong'),
  email: z.email('validation.invalidEmail').max(255, 'validation.emailTooLong'),
  password: z.string().min(8, 'validation.passwordTooShort').max(100, 'validation.passwordTooLong'),
});
