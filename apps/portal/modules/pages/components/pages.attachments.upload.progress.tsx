'use client';

import { useTranslations } from 'next-intl';

/**
 * What is shown while a file is on its way up.
 *
 * The bar carries no percentage because the system does not know one; a moving
 * bar that counts to a hundred on its own schedule is a promise nobody made.
 */
export const PagesAttachmentsUploadProgress = () => {
  const t = useTranslations('pages.attachments');

  return (
    <div className="space-y-1">
      <div aria-label={t('uploadProgress')} className="h-2 w-full overflow-hidden bg-muted" role="progressbar">
        <div className="size-full animate-pulse bg-primary motion-reduce:animate-none" />
      </div>
      <p aria-live="polite" className="text-muted-foreground text-xs" role="status">
        {t('uploading')}
      </p>
    </div>
  );
};
