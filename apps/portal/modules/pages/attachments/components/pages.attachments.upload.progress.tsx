'use client';

import { useTranslations } from 'next-intl';

/** Indeterminate on purpose: the upload reports no progress, so a percentage would be invented. */
export const PagesAttachmentsUploadProgress = () => {
  const t = useTranslations('pages.attachments');

  return (
    <div className="space-y-1">
      <progress aria-label={t('uploadProgress')} className="sr-only" />
      <div aria-hidden="true" className="h-2 w-full overflow-hidden bg-muted">
        <div className="size-full animate-pulse bg-primary motion-reduce:animate-none" />
      </div>
      <p aria-live="polite" className="text-muted-foreground text-xs" role="status">
        {t('uploading')}
      </p>
    </div>
  );
};
