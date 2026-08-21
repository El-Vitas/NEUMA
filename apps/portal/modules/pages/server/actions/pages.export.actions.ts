'use server';

import 'server-only';

import { actionClient } from '@/lib/safe-action';
import { apiRequestText } from '@/shared/lib/api-server';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';
import { withAction } from '@/shared/lib/with-action.lib';
import { PAGE_API_ROUTES } from '../../constants/pages.constants';
import { pageExportRequestSchema } from '../../schemas/pages.export.schemas';

export const exportPagesAsMarkdownAction = actionClient
  .inputSchema(pageExportRequestSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'exportPages' }, async (): Promise<string> => {
      const accessToken = await requireAccessTokenCookie();
      const query = new URLSearchParams({ scope: parsedInput.scope, untitledLabel: parsedInput.untitledLabel });
      if (parsedInput.pageId !== null) query.set('pageId', parsedInput.pageId);
      return apiRequestText(PAGE_API_ROUTES.exportMarkdown(parsedInput.spaceId, query.toString()), accessToken);
    }),
  );
