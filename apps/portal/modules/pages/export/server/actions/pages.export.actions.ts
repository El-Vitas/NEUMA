'use server';

import 'server-only';

import { actionClient } from '@/lib/safe-action';
import { apiRequestFile } from '@/shared/lib/api-server';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';
import { withAction } from '@/shared/lib/with-action.lib';
import type { DownloadedFile } from '@/shared/types/downloaded-file.types';
import { PAGE_API_ROUTES } from '../../../constants/pages.constants';
import { pageExportRequestSchema } from '../../schemas/pages.export.schemas';

export const exportPagesAsMarkdownAction = actionClient
  .inputSchema(pageExportRequestSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'exportPages' }, async (): Promise<DownloadedFile> => {
      const accessToken = await requireAccessTokenCookie();
      const query = new URLSearchParams({ scope: parsedInput.scope, untitledLabel: parsedInput.untitledLabel });
      if (parsedInput.pageId !== null) query.set('pageId', parsedInput.pageId);
      for (const pageId of parsedInput.pageIds) query.append('pageIds', pageId);
      return apiRequestFile(PAGE_API_ROUTES.exportMarkdown(parsedInput.spaceId, query.toString()), accessToken);
    }),
  );
