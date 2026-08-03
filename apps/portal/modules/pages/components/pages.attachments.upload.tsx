'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { uploadPageAttachmentAction } from '../server/actions/pages.attachments.actions';
import type { AttachmentSummary } from '../types/pages.attachments.types';

interface IProps {
  readonly onUploaded: (attachment: AttachmentSummary) => void;
  readonly pageId: string;
}

export const PagesAttachmentsUpload = ({ onUploaded, pageId }: IProps) => {
  const t = useTranslations('pages.attachments');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState(0);

  const submit = () => {
    const file = inputRef.current?.files?.[0];
    if (file === undefined) return;
    const formData = new FormData();
    formData.set('file', file);
    formData.set('pageId', pageId);
    setProgress(10);
    startTransition(async () => {
      const result = await uploadPageAttachmentAction(formData);
      if (!result.ok) {
        setProgress(0);
        toast.error(t(result.error === 'invalid' ? 'validationError' : 'uploadError'));
        return;
      }
      setProgress(100);
      onUploaded(result.attachment);
      toast.success(t('uploaded'));
      if (inputRef.current !== null) inputRef.current.value = '';
    });
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm text-status-muted" htmlFor="page-attachment">
        {t('selectFile')}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          accept="application/pdf,application/zip,image/gif,image/jpeg,image/png,image/webp,text/plain"
          className="min-h-10 min-w-0 flex-1 border border-border bg-background p-2 text-sm"
          disabled={isPending}
          id="page-attachment"
          ref={inputRef}
          type="file"
        />
        <button
          className="min-h-10 border border-border px-3 text-foreground text-xs hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          disabled={isPending}
          onClick={submit}
          type="button"
        >
          {isPending ? t('uploading') : t('upload')}
        </button>
      </div>
      {isPending && (
        <div
          aria-label={t('uploadProgress')}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={progress}
          className="h-1 bg-muted"
          role="progressbar"
        >
          <div className="h-1 bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      <p className="text-muted-foreground text-xs">{t('fileHelp')}</p>
    </div>
  );
};
