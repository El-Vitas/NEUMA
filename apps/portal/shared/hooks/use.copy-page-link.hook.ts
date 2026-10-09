'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { copyTextToClipboard } from '@/shared/lib/clipboard.lib';
import { buildPortalPageLink } from '@/shared/lib/page-link.lib';

/**
 * Copia el enlace de una página y dice si se pudo.
 *
 * Lo usan el encabezado de la página y su menú en el árbol, para que copiar el
 * enlace suene y funcione igual desde los dos lados.
 */
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
