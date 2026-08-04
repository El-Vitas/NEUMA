'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { AttachmentSummary } from '../types/pages.attachments.types';
import { PagesAttachmentItem } from './pages.attachment.item';
import { PagesAttachmentsUpload } from './pages.attachments.upload';

interface IProps {
  readonly attachments: readonly AttachmentSummary[];
  readonly canEdit: boolean;
  readonly onAssetUploaded?: (attachment: AttachmentSummary) => void;
  readonly pageId?: string;
}

export const PagesAttachments = ({ attachments: initialAttachments, canEdit, onAssetUploaded, pageId }: IProps) => {
  const t = useTranslations('pages.attachments');
  const [attachments, setAttachments] = useState(initialAttachments);

  const handleUploaded = (attachment: AttachmentSummary): void => {
    setAttachments((current) => [...current, attachment]);
    onAssetUploaded?.(attachment);
  };

  return (
    <section aria-labelledby="page-attachments-title" className="space-y-4 border border-border bg-card p-4 sm:p-6">
      <div>
        <h2 className="text-base text-foreground" id="page-attachments-title">
          {t('title')}
        </h2>
        <p className="mt-1 text-muted-foreground text-sm">{t('description')}</p>
      </div>
      {canEdit && pageId !== undefined && <PagesAttachmentsUpload onUploaded={handleUploaded} pageId={pageId} />}
      {attachments.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('empty')}</p>
      ) : (
        <ul aria-label={t('title')} className="space-y-2">
          {attachments.map((attachment) => (
            <PagesAttachmentItem
              attachment={attachment}
              canEdit={canEdit}
              key={attachment.id}
              onDeleted={(attachmentId) =>
                setAttachments((current) => current.filter((item) => item.id !== attachmentId))
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
};
