'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { buildPortalPageLink } from '@/shared/lib/page-link.lib';

/**
 * Copia el enlace de una página y dice si se pudo.
 *
 * Lo usan el encabezado de la página y su menú en el árbol, para que copiar el
 * enlace suene y funcione igual desde los dos lados.
 */
export const useCopyPageLink = (): ((spaceId: string, pageId: string) => void) => {
  const t = useTranslations('pages');

  return useCallback(
    (spaceId: string, pageId: string): void => {
      void navigator.clipboard
        .writeText(buildPortalPageLink(globalThis.location.origin, spaceId, pageId))
        .then(() => toast.success(t('pageLinkCopied')))
        .catch(() => toast.error(t('blockLinkCopyFailed')));
    },
    [t],
  );
};
