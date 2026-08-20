'use server';

import 'server-only';

import { actionClient } from '@/lib/safe-action';
import { SPACE_MOVE_ACCESS_LOSS_API_ROUTE } from '@/shared/constants/space-move-access.constants';
import { apiServer } from '@/shared/lib/api-server';
import { withAction } from '@/shared/lib/with-action.lib';
import { spaceMoveAccessLossInputSchema, spaceMoveAccessLossSchema } from '@/shared/schemas/space-move-access.schemas';
import type { SpaceMoveAccessLoss } from '@/shared/types/space-move-access.types';

/**
 * How many people who can read the source space today would not read the
 * destination — asked before a cross-space move is confirmed, never while
 * moving within the same space, since that never changes who can see it.
 */
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
