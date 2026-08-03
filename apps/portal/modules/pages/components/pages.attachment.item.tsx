'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { formatAttachmentSize } from '../lib/pages.attachments.lib';
import { deletePageAttachmentAction, downloadPageAttachmentAction } from '../server/actions/pages.attachments.actions';
import type { AttachmentSummary } from '../types/pages.attachments.types';

interface IProps {
  readonly attachment: AttachmentSummary;
  readonly canEdit: boolean;
  readonly onDeleted: (attachmentId: string) => void;
}

export const PagesAttachmentItem = ({ attachment, canEdit, onDeleted }: IProps) => {
  const t = useTranslations('pages.attachments');
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);

  const download = () => {
    startTransition(async () => {
      const result = await downloadPageAttachmentAction(attachment.id);
      if (!result.ok) {
        toast.error(t('downloadError'));
        return;
      }
      const blob = new Blob([new Uint8Array(result.download.body)], { type: result.download.mimeType });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = result.download.originalFilename;
      link.click();
      URL.revokeObjectURL(link.href);
    });
  };

  const remove = () => {
    setIsDeleting(true);
    startTransition(async () => {
      const result = await deletePageAttachmentAction(attachment.id);
      setIsDeleting(false);
      if (!result.ok) {
        toast.error(t('deleteError'));
        return;
      }
      onDeleted(attachment.id);
      toast.success(t('deleted'));
    });
  };

  const isBusy = isPending || isDeleting;
  return (
    <li className="flex min-w-0 flex-wrap items-center justify-between gap-3 border border-border bg-card p-3">
      <div className="min-w-0">
        <p className="truncate text-foreground text-sm">{attachment.originalFilename}</p>
        <p className="text-muted-foreground text-xs">{formatAttachmentSize(attachment.size)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          aria-label={t('downloadNamed', { name: attachment.originalFilename })}
          className="min-h-10 border border-border px-3 text-foreground text-xs hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          disabled={isBusy}
          onClick={download}
          type="button"
        >
          {isPending ? t('downloading') : t('download')}
        </button>
        {canEdit && (
          <button
            aria-label={t('deleteNamed', { name: attachment.originalFilename })}
            className="min-h-10 border border-destructive/40 px-3 text-destructive text-xs hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring"
            disabled={isBusy}
            onClick={remove}
            type="button"
          >
            {isDeleting ? t('deleting') : t('delete')}
          </button>
        )}
      </div>
    </li>
  );
};
