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
  user: userSchema,
});

export const loginSchema = z.object({
  email: z.email('Ingresa un correo electrónico válido').max(255, 'El correo no puede superar los 255 caracteres'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(100, 'La contraseña no puede superar los 100 caracteres'),
});

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
  email: z.email('Ingresa un correo electrónico válido').max(255, 'El correo no puede superar los 255 caracteres'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(100, 'La contraseña no puede superar los 100 caracteres'),
});
