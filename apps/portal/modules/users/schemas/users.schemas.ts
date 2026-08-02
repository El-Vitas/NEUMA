import { EMAIL_MAX_LENGTH } from '@company-brain/shared';
import { z } from 'zod';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/shared/constants/password.constants';
import {
  USER_NAME_MAX_LENGTH,
  USER_NAME_MIN_LENGTH,
  USERS_DEFAULT_PAGE,
  USERS_DEFAULT_PAGE_SIZE,
  USERS_MAX_PAGE_SIZE,
} from '../constants/users.constants';

export const usersListParamsSchema = z.object({
  page: z.coerce.number().int().min(USERS_DEFAULT_PAGE).catch(USERS_DEFAULT_PAGE),
  pageSize: z.coerce.number().int().min(1).max(USERS_MAX_PAGE_SIZE).catch(USERS_DEFAULT_PAGE_SIZE),
  search: z.string().trim().max(EMAIL_MAX_LENGTH).catch(''),
});

export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(USER_NAME_MIN_LENGTH, `El nombre debe tener al menos ${USER_NAME_MIN_LENGTH} caracteres`)
    .max(USER_NAME_MAX_LENGTH, `El nombre no puede superar los ${USER_NAME_MAX_LENGTH} caracteres`),
  email: z
    .email('Ingresa un correo electrónico válido')
    .max(EMAIL_MAX_LENGTH, `El correo no puede superar los ${EMAIL_MAX_LENGTH} caracteres`),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`)
    .max(PASSWORD_MAX_LENGTH, `La contraseña no puede superar los ${PASSWORD_MAX_LENGTH} caracteres`),
});

export const updateUserNameSchema = z.object({
  userId: z.string().min(1),
  name: z
    .string()
    .trim()
    .min(USER_NAME_MIN_LENGTH, `El nombre debe tener al menos ${USER_NAME_MIN_LENGTH} caracteres`)
    .max(USER_NAME_MAX_LENGTH, `El nombre no puede superar los ${USER_NAME_MAX_LENGTH} caracteres`),
});
