'use server';

import 'server-only';
import { actionClient } from '@/lib/safe-action';
import { apiServer } from '@/shared/lib/api-server';
import { withAction } from '@/shared/lib/with-action.lib';
import { API_ROUTES } from '@/shared/routes/constants/routes.constants';
import { UpdateNameSchema, UpdatePasswordSchema } from '../../schemas/profile.schemas';

export const updateProfileNameAction = actionClient.schema(UpdateNameSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'updateProfileName' }, async () => {
    await apiServer.patch(`${API_ROUTES.USERS}/${parsedInput.userId}`, { name: parsedInput.name });
  }),
);

export const updatePasswordAction = actionClient.schema(UpdatePasswordSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'updatePassword' }, async () => {
    await apiServer.patch(`${API_ROUTES.USERS}/${parsedInput.userId}/password`, {
      currentPassword: parsedInput.currentPassword,
      newPassword: parsedInput.newPassword,
    });
  }),
);
