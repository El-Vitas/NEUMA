'use client';

import { useTranslations } from 'next-intl';
import type { AttachmentSummary } from '../types/pages.attachments.types';
import { PagesAttachmentItem } from './pages.attachment.item';
import { PagesAttachmentsUpload } from './pages.attachments.upload';

interface IProps {
  readonly attachments: readonly AttachmentSummary[];
  readonly canEdit: boolean;
  readonly onAssetDeleted: (attachmentId: string) => void;
  readonly onAssetUploaded: (attachment: AttachmentSummary) => void;
  readonly pageId?: string;
}

export const PagesAttachments = ({ attachments, canEdit, onAssetDeleted, onAssetUploaded, pageId }: IProps) => {
  const t = useTranslations('pages.attachments');

  const handleUploaded = (attachment: AttachmentSummary): void => onAssetUploaded(attachment);

  return (
    <section aria-labelledby="page-attachments-title" className="space-y-4 border-border border-t pt-6">
      <div>
        <h2 className="font-display text-2xl text-foreground" id="page-attachments-title">
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
              onDeleted={(attachmentId) => {
                onAssetDeleted(attachmentId);
              }}
            />
          ))}
        </ul>
      )}
    </section>
  );
};
