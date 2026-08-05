'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { attachmentUploadSchema } from '../schemas/pages.attachments.schemas';
import { uploadPageAttachmentAction } from '../server/actions/pages.attachments.actions';
import type {
  AttachmentUploadError,
  PagesAttachmentUploadController,
  PagesAttachmentUploadOptions,
} from '../types/pages.attachments.types';

export const usePagesAttachmentUpload = ({
  onUploaded,
  pageId,
}: PagesAttachmentUploadOptions): PagesAttachmentUploadController => {
  const t = useTranslations('pages.attachments');
  const [isPending, startTransition] = useTransition();
  const [lastFile, setLastFile] = useState<File | undefined>();
  const [error, setError] = useState<AttachmentUploadError | null>(null);
  const isUploadingRef = useRef(false);

  const clearError = useCallback((): void => setError(null), []);

  const upload = useCallback(
    (file: File | undefined): void => {
      if (isUploadingRef.current) return;
      const fileToUpload = file ?? lastFile;
      const parsedUpload = attachmentUploadSchema.safeParse({ file: fileToUpload, pageId });
      if (!parsedUpload.success) {
        setLastFile(fileToUpload);
        setError('invalid');
        toast.error(t('validationError'));
        return;
      }

      setLastFile(parsedUpload.data.file);
      setError(null);
      const formData = new FormData();
      formData.set('file', parsedUpload.data.file);
      formData.set('pageId', parsedUpload.data.pageId);
      isUploadingRef.current = true;
      startTransition(async () => {
        try {
          const result = await uploadPageAttachmentAction(formData);
          if (!result.ok) {
            setError(result.error);
            toast.error(t(result.error === 'invalid' ? 'validationError' : 'uploadError'));
            return;
          }
          setLastFile(undefined);
          onUploaded(result.attachment);
          toast.success(t('uploaded'));
        } catch {
          setError('request');
          toast.error(t('uploadError'));
        } finally {
          isUploadingRef.current = false;
        }
      });
    },
    [lastFile, onUploaded, pageId, t],
  );

  const retry = useCallback((): void => upload(undefined), [upload]);

  return { clearError, error, isPending, retry, upload };
};
