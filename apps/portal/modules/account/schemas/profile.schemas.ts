import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@neuma/shared';
import { z } from 'zod';

export const UpdateNameSchema = z.object({
  name: z.string().min(1).max(100),
});

export const UpdatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});
