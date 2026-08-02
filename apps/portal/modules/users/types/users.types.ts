import type { User } from '@company-brain/shared';
import type { z } from 'zod';
import type { createUserSchema, updateUserNameSchema, usersListParamsSchema } from '../schemas/users.schemas';

export interface UserListItem extends User {
  readonly isActive: boolean;
  readonly createdAt: string;
}

export interface UsersList {
  readonly items: UserListItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export type UsersListParams = z.infer<typeof usersListParamsSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserNameInput = z.infer<typeof updateUserNameSchema>;
