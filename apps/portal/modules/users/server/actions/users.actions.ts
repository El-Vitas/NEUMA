'use server';

import 'server-only';
import { canManageWorkspace } from '@company-brain/shared';
import { updateTag } from 'next/cache';
import { actionClient } from '@/lib/safe-action';
import { registerUser } from '@/modules/auth/server/lib/auth.server';
import { CURRENT_USER_CACHE_TAG } from '@/shared/constants/current-user-cache.constants';
import { apiServer } from '@/shared/lib/api-server';
import { withAction } from '@/shared/lib/with-action.lib';
import { API_ROUTES } from '@/shared/routes/constants/routes.constants';
import { getCurrentUser } from '@/shared/server/lib/current-user.server';
import { USERS_CACHE_TAG } from '../../constants/users.constants';
import { UsersAdministrationDeniedError } from '../../lib/users.errors';
import { createUserSchema, updateUserNameSchema } from '../../schemas/users.schemas';

/**
 * Refuses anybody who does not run the workspace.
 *
 * The screen that offers these is behind a check, but the screen is not the
 * door: an action answers to its own address, so whoever knows the address
 * reaches it without ever loading the screen.
 */
const requireWorkspaceManager = async (): Promise<void> => {
  const user = await getCurrentUser();
  if (user === null || !canManageWorkspace(user.role)) throw new UsersAdministrationDeniedError();
};

export const createUserAction = actionClient.inputSchema(createUserSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'createUser' }, async () => {
    await requireWorkspaceManager();
    await registerUser(parsedInput);
    updateTag(USERS_CACHE_TAG);
  }),
);

export const updateUserNameAction = actionClient.inputSchema(updateUserNameSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'updateUserName' }, async () => {
    await requireWorkspaceManager();
    await apiServer.patch(`${API_ROUTES.USERS}/${parsedInput.userId}`, { name: parsedInput.name });
    updateTag(USERS_CACHE_TAG);
    /** Whoever runs the workspace can rename themselves from here, and would otherwise keep seeing the old name. */
    updateTag(CURRENT_USER_CACHE_TAG);
  }),
);
