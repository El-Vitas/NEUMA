'use client';

import { Paperclip } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef } from 'react';
import { ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_SIZE } from '../constants/pages.attachments.constants';
import { formatAttachmentSize } from '../lib/pages.attachments.lib';
import type { AttachmentUploadError } from '../types/pages.attachments.types';

interface IProps {
  readonly error: AttachmentUploadError | null;
  readonly isPending: boolean;
  readonly onFileSelected: (file: File | undefined) => void;
  readonly onRetry: () => void;
}

export const PagesEditorAttachmentUpload = ({ error, isPending, onFileSelected, onRetry }: IProps) => {
  const t = useTranslations('pages.attachments');
  const tPanel = useTranslations('pages.attachmentsPanel');
  const locale = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const refusalKey = error === 'invalid' ? 'validationError' : 'uploadError';
  const errorMessage =
    error === 'tooLarge'
      ? tPanel('fileTooLarge', { limit: formatAttachmentSize(MAX_ATTACHMENT_SIZE, locale) })
      : t(refusalKey);

  return (
    <div className="flex min-w-0 items-center gap-1">
      <input
        accept={ATTACHMENT_MIME_TYPES.join(',')}
        aria-label={t('selectFile')}
        className="sr-only"
        data-page-file-input="true"
        disabled={isPending}
        onChange={(event) => {
          const selectedFile = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          onFileSelected(selectedFile);
        }}
        ref={inputRef}
        type="file"
      />
      <button
        aria-busy={isPending}
        aria-label={t('upload')}
        className="min-h-11 min-w-11 px-3 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        <Paperclip aria-hidden="true" className="mx-auto size-4" />
      </button>
      {isPending && (
        <span aria-live="polite" className="text-muted-foreground text-xs" role="status">
          {t('uploading')}
        </span>
      )}
      {error !== null && (
        <div className="flex items-center gap-2">
          <span className="wrap-break-word text-destructive text-xs" role="alert">
            {errorMessage}
          </span>
          {error === 'request' && (
            <button
              className="min-h-11 px-2 text-foreground text-xs underline underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={isPending}
              onClick={onRetry}
              type="button"
            >
              {t('upload')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
