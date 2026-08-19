'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { hasActionError, isActionSuccess } from '@/shared/lib/action-result';
import { MAX_ATTACHMENT_SIZE } from '../constants/pages.attachments.constants';
import { formatAttachmentSize, getAttachmentUploadErrorFromResult } from '../lib/pages.attachments.lib';
import { attachmentUploadSchema } from '../schemas/pages.attachments.schemas';
import { uploadPageAttachmentAction } from '../server/actions/pages.attachments.actions';
import type {
  AttachmentSummary,
  AttachmentUploadError,
  PagesAttachmentUploadController,
  PagesAttachmentUploadOptions,
} from '../types/pages.attachments.types';

export const usePagesAttachmentUpload = ({
  onUploaded,
  pageId,
}: PagesAttachmentUploadOptions): PagesAttachmentUploadController => {
  const t = useTranslations('pages.attachments');
  const tPanel = useTranslations('pages.attachmentsPanel');
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [lastFile, setLastFile] = useState<File | undefined>();
  const [error, setError] = useState<AttachmentUploadError | null>(null);
  const isUploadingRef = useRef(false);

  const clearError = useCallback((): void => setError(null), []);

  const upload = useCallback(
    (file: File | undefined): void => {
      if (isUploadingRef.current) return;
      const fileToUpload = file ?? lastFile;
      if (fileToUpload !== undefined && fileToUpload.size > MAX_ATTACHMENT_SIZE) {
        setLastFile(fileToUpload);
        setError('tooLarge');
        const formattedLimit = formatAttachmentSize(MAX_ATTACHMENT_SIZE, locale);
        toast.error(tPanel('fileTooLarge', { limit: formattedLimit }));
        return;
      }
      const parsedUpload = attachmentUploadSchema.safeParse({ file: fileToUpload, pageId });
      if (!parsedUpload.success) {
        setLastFile(fileToUpload);
        setError('invalid');
        toast.error(t('validationError'));
        return;
      }

      setLastFile(parsedUpload.data.file);
      setError(null);
      isUploadingRef.current = true;
      startTransition(async () => {
        try {
          const result = await uploadPageAttachmentAction(parsedUpload.data);
          if (isActionSuccess<AttachmentSummary>(result)) {
            setLastFile(undefined);
            onUploaded(result.data);
            toast.success(t('uploaded'));
            return;
          }
          const uploadError = hasActionError(result) ? getAttachmentUploadErrorFromResult(result) : 'request';
          setError(uploadError);
          toast.error(uploadError === 'invalid' ? t('validationError') : tPanel('uploadError'));
        } catch {
          setError('request');
          toast.error(tPanel('uploadError'));
        } finally {
          isUploadingRef.current = false;
        }
      });
    },
    [lastFile, locale, onUploaded, pageId, t, tPanel],
  );

  const retry = useCallback((): void => upload(undefined), [upload]);

  return { clearError, error, isPending, retry, upload };
};
