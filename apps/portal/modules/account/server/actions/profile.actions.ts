'use server';

import 'server-only';
import { updateTag } from 'next/cache';
import { actionClient } from '@/lib/safe-action';
import { signInAgainOrReleaseSession } from '@/modules/auth/server/lib/auth.server';
import { CURRENT_USER_CACHE_TAG } from '@/shared/constants/current-user-cache.constants';
import { apiServer } from '@/shared/lib/api-server';
import { withAction } from '@/shared/lib/with-action.lib';
import { API_ROUTES } from '@/shared/routes/constants/routes.constants';
import { UpdateNameSchema, UpdatePasswordSchema } from '../../schemas/profile.schemas';
import { requireOwnAccount, requireOwnAccountId } from '../lib/account.owner.server';

export const updateProfileNameAction = actionClient.inputSchema(UpdateNameSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'updateProfileName' }, async () => {
    const userId = await requireOwnAccountId();
    await apiServer.patch(`${API_ROUTES.USERS}/${userId}`, { name: parsedInput.name });
    /** Without it the account keeps showing the old name for a few seconds. */
    updateTag(CURRENT_USER_CACHE_TAG);
  }),
);

export const updatePasswordAction = actionClient.inputSchema(UpdatePasswordSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'updatePassword' }, async () => {
    const account = await requireOwnAccount();
    await apiServer.patchDiscardingBody(`${API_ROUTES.USERS}/${account.id}/password`, {
      currentPassword: parsedInput.currentPassword,
      newPassword: parsedInput.newPassword,
    });
    return signInAgainOrReleaseSession({ email: account.email, password: parsedInput.newPassword });
  }),
);
