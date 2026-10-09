'use server';

import 'server-only';

import { actionClient } from '@/lib/safe-action';
import { SPACE_MOVE_ACCESS_LOSS_API_ROUTE } from '@/shared/constants/space-move-access.constants';
import { apiServer } from '@/shared/lib/api-server';
import { withAction } from '@/shared/lib/with-action.lib';
import { spaceMoveAccessLossInputSchema, spaceMoveAccessLossSchema } from '@/shared/schemas/space-move-access.schemas';
import type { SpaceMoveAccessLoss } from '@/shared/types/space-move-access.types';

/** Only for cross-space moves: moving within a space never changes who can see the page. */
export const getSpaceMoveAccessLossAction = actionClient
  .inputSchema(spaceMoveAccessLossInputSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'getSpaceMoveAccessLoss' }, async (): Promise<SpaceMoveAccessLoss> => {
      const response = await apiServer.get<unknown>(
        SPACE_MOVE_ACCESS_LOSS_API_ROUTE(parsedInput.sourceSpaceId, parsedInput.targetSpaceId),
      );
      return spaceMoveAccessLossSchema.parse(response);
    }),
  );
