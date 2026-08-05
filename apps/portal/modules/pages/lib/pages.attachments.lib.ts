import type { ActionFailure } from '@/shared/types/action-result.types';
import { IMAGE_ATTACHMENT_MIME_TYPE_PREFIX } from '../constants/pages.attachments.constants';
import type { AttachmentDownload, AttachmentSummary, AttachmentUploadError } from '../types/pages.attachments.types';
import type { PageAssetInsertCommandOptions, PageAssetNodeType } from '../types/pages.types';

export const getAttachmentUploadErrorFromResult = (result: ActionFailure): AttachmentUploadError =>
  result.validationErrors === undefined ? 'request' : 'invalid';

export const formatAttachmentSize = (size: number): string => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${Math.round(size / (1024 * 1024))} MB`;
};

export const mapAttachmentMimeTypeToPageAssetNodeType = (mimeType: string): PageAssetNodeType =>
  mimeType.startsWith(IMAGE_ATTACHMENT_MIME_TYPE_PREFIX) ? 'image' : 'file';

export const buildPageAssetInsertOptionsFromAttachment = (
  attachment: AttachmentSummary,
): PageAssetInsertCommandOptions => {
  const nodeType = mapAttachmentMimeTypeToPageAssetNodeType(attachment.mimeType);
  const displayMetadata =
    nodeType === 'image' ? { alt: attachment.originalFilename } : { caption: attachment.originalFilename };
  return { assetId: attachment.id, ...displayMetadata };
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
