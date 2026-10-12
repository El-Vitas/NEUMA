'use client';

import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { isActionSuccess, readActionFailureReason } from '@/shared/lib/action-result';
import type { DownloadedFile } from '@/shared/types/downloaded-file.types';
import { downloadExportedFile } from '../lib/pages.export.download.lib';
import { buildPagesExportFileName } from '../lib/pages.export.lib';
import { exportPagesAsMarkdownAction } from '../server/actions/pages.export.actions';
import type { PagesExportRequest, PagesExportResult } from '../types/pages.export.types';

export const usePagesExport = (): PagesExportResult => {
  const t = useTranslations('pages.export');
  const tErrors = useTranslations('errors');
  const [isExporting, startTransition] = useTransition();

  const exportPages = ({ exportedName, pageId, pageIds = [], scope, spaceId }: PagesExportRequest): void => {
    startTransition(async () => {
      const written = await exportPagesAsMarkdownAction({
        pageId,
        pageIds: [...pageIds],
        scope,
        spaceId,
        untitledLabel: t('untitled'),
      });
      if (!isActionSuccess<DownloadedFile>(written)) {
        toast.error(tErrors(`reasons.${readActionFailureReason(written)}`));
        return;
      }
      const fileName = buildPagesExportFileName(exportedName, written.data.mediaType);
      downloadExportedFile(fileName, written.data.base64, written.data.mediaType);
      toast.success(t('done', { file: fileName }));
    });
  };

  return { exportPages, isExporting };
};
