import { EMAIL_MAX_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, USER_ROLE_VALUES } from '@neuma/shared';
import { z } from 'zod';
import { pathSegmentSchema } from '@/shared/schemas/path-segment.schemas';
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
    .min(USER_NAME_MIN_LENGTH, 'validation.nameTooShort')
    .max(USER_NAME_MAX_LENGTH, 'validation.nameTooLong'),
  email: z.email('validation.invalidEmail').max(EMAIL_MAX_LENGTH, 'validation.emailTooLong'),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, 'validation.passwordTooShort')
    .max(PASSWORD_MAX_LENGTH, 'validation.passwordTooLong'),
  role: z.enum(USER_ROLE_VALUES),
});

export const updateUserNameSchema = z.object({
  userId: pathSegmentSchema,
  name: z
    .string()
    .trim()
    .min(USER_NAME_MIN_LENGTH, 'validation.nameTooShort')
    .max(USER_NAME_MAX_LENGTH, 'validation.nameTooLong'),
});
