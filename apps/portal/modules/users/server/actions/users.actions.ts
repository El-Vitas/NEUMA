'use server';

import 'server-only';
import { updateTag } from 'next/cache';
import { actionClient } from '@/lib/safe-action';
import { registerUser } from '@/modules/auth/server/lib/auth.server';
import { apiServer } from '@/shared/lib/api-server';
import { withAction } from '@/shared/lib/with-action.lib';
import { API_ROUTES } from '@/shared/routes/constants/routes.constants';
import { USERS_CACHE_TAG } from '../../constants/users.constants';
import { createUserSchema, updateUserNameSchema } from '../../schemas/users.schemas';

export const createUserAction = actionClient.inputSchema(createUserSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'createUser' }, async () => {
    await registerUser(parsedInput);
    updateTag(USERS_CACHE_TAG);
  }),
);

export const updateUserNameAction = actionClient.inputSchema(updateUserNameSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'updateUserName' }, async () => {
    await apiServer.patch(`${API_ROUTES.USERS}/${parsedInput.userId}`, { name: parsedInput.name });
    updateTag(USERS_CACHE_TAG);
  }),
);
