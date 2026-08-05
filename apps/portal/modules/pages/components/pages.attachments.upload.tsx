'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { ATTACHMENT_MIME_TYPES } from '../constants/pages.attachments.constants';
import { usePagesAttachmentUpload } from '../hooks/use.pages.attachment.upload';
import type { AttachmentSummary } from '../types/pages.attachments.types';

interface IProps {
  readonly onUploaded: (attachment: AttachmentSummary) => void;
  readonly pageId: string;
}

export const PagesAttachmentsUpload = ({ onUploaded, pageId }: IProps) => {
  const t = useTranslations('pages.attachments');
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | undefined>();
  const { clearError, error, isPending, retry, upload } = usePagesAttachmentUpload({
    onUploaded: (attachment) => {
      if (inputRef.current !== null) inputRef.current.value = '';
      setSelectedFile(undefined);
      onUploaded(attachment);
    },
    pageId,
  });
  const isValidationError = error === 'invalid';

  return (
    <div className="space-y-2">
      <label className="block text-sm text-status-muted" htmlFor="page-attachment">
        {t('selectFile')}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          accept={ATTACHMENT_MIME_TYPES.join(',')}
          aria-describedby={error === null ? 'page-attachment-help' : 'page-attachment-help page-attachment-error'}
          aria-invalid={error !== null}
          className="min-h-11 min-w-0 flex-1 border border-border bg-background p-2 text-sm"
          disabled={isPending}
          id="page-attachment"
          onChange={(event) => {
            setSelectedFile(event.currentTarget.files?.[0]);
            clearError();
          }}
          ref={inputRef}
          type="file"
        />
        <button
          className="min-h-11 border border-border px-3 text-foreground text-xs hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          disabled={isPending}
          onClick={() => upload(selectedFile)}
          type="button"
        >
          {isPending ? t('uploading') : t('upload')}
        </button>
      </div>
      {isPending && (
        <p aria-live="polite" className="text-muted-foreground text-xs" role="status">
          {t('uploading')}
        </p>
      )}
      {error !== null && (
        <div className="flex items-center gap-2" id="page-attachment-error">
          <p className="text-destructive text-xs" role="alert">
            {t(isValidationError ? 'validationError' : 'uploadError')}
          </p>
          {error === 'request' && (
            <button
              className="min-h-11 px-2 text-foreground text-xs underline underline-offset-4 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
              disabled={isPending}
              onClick={retry}
              type="button"
            >
              {t('upload')}
            </button>
          )}
        </div>
      )}
      <p className="text-muted-foreground text-xs" id="page-attachment-help">
        {t('fileHelp')}
      </p>
    </div>
  );
};
