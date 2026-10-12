'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { copyTextToClipboard } from '@/shared/lib/clipboard.lib';
import { buildPortalPageLink } from '@/shared/lib/page-link.lib';

export const useCopyPageLink = (): ((spaceId: string, pageId: string) => Promise<void>) => {
  const t = useTranslations('pages');

  return useCallback(
    async (spaceId: string, pageId: string): Promise<void> => {
      const link = buildPortalPageLink(globalThis.location.origin, spaceId, pageId);
      if (await copyTextToClipboard(link)) toast.success(t('pageLinkCopied'));
      else toast.error(t('pageLinkCopyFailed'));
    },
    [t],
  );
};
