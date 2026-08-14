import type { ActionFailure } from '@/shared/types/action-result.types';
import {
  AUDIO_ATTACHMENT_MIME_TYPE_PREFIX,
  IMAGE_ATTACHMENT_MIME_TYPE_PREFIX,
  VIDEO_ATTACHMENT_MIME_TYPE_PREFIX,
} from '../constants/pages.attachments.constants';
import type { AttachmentDownload, AttachmentSummary, AttachmentUploadError } from '../types/pages.attachments.types';
import type { PageAssetInsertCommandOptions, PageAssetNodeType } from '../types/pages.types';

export const getAttachmentUploadErrorFromResult = (result: ActionFailure): AttachmentUploadError =>
  result.validationErrors === undefined ? 'request' : 'invalid';

export const formatAttachmentSize = (size: number): string => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${Math.round(size / (1024 * 1024))} MB`;
};

/** What a page makes of a file: a picture, something that plays, or a file to take away. */
export const mapAttachmentMimeTypeToPageAssetNodeType = (mimeType: string): PageAssetNodeType => {
  if (mimeType.startsWith(IMAGE_ATTACHMENT_MIME_TYPE_PREFIX)) return 'image';
  if (mimeType.startsWith(VIDEO_ATTACHMENT_MIME_TYPE_PREFIX)) return 'video';
  if (mimeType.startsWith(AUDIO_ATTACHMENT_MIME_TYPE_PREFIX)) return 'audio';
  return 'file';
};

export const buildPageAssetInsertOptionsFromAttachment = (
  attachment: AttachmentSummary,
): PageAssetInsertCommandOptions => {
  const nodeType = mapAttachmentMimeTypeToPageAssetNodeType(attachment.mimeType);
  if (nodeType === 'image') return { alt: attachment.originalFilename, assetId: attachment.id };
  if (nodeType === 'file') {
    return {
      assetId: attachment.id,
      caption: attachment.originalFilename,
      mimeType: attachment.mimeType,
      size: attachment.size,
    };
  }
  return { assetId: attachment.id, caption: attachment.originalFilename };
};

export const triggerAttachmentBlobDownload = (download: AttachmentDownload): void => {
  const blob = new Blob([new Uint8Array(download.body)], { type: download.mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = download.originalFilename;
  link.click();
  URL.revokeObjectURL(objectUrl);
};
