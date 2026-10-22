'use server';

import 'server-only';

import { actionClient } from '@/lib/safe-action';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';
import { withAction } from '@/shared/lib/with-action.lib';
import { pageTreeWindowsInputSchema } from '../../schemas/pages.tree.schemas';
import type { PageTreeChildren } from '../../types/pages.tree.types';
import { readTreeWindow } from '../lib/pages.tree.server';

/** Reads, not writes: the sidebar asks for the windows it has open, and nothing is cached so they come fresh. */
export const readTreeWindowsAction = actionClient
  .inputSchema(pageTreeWindowsInputSchema)
  .action(async ({ parsedInput }) =>
    withAction(
      { action: 'readTreeWindows', windows: parsedInput.requests.length },
      async (): Promise<PageTreeChildren[]> => {
        const accessToken = await requireAccessTokenCookie();
        return Promise.all(
          parsedInput.requests.map((request) => readTreeWindow(accessToken, parsedInput.spaceId, request)),
        );
      },
    ),
  );
