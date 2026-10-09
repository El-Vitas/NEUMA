import type { ActionFailure } from '@/shared/types/action-result.types';
import type { PageCoverValue } from '../../appearance/types/pages.cover.types';
import type { PageIcon } from '../../appearance/types/pages.icon.types';
import type { PageAssetInsertCommandOptions, PageAssetNodeType } from '../../types/pages.types';
import {
  ATTACHMENT_SIZE_UNITS,
  ATTACHMENT_TYPE_LABELS,
  AUDIO_ATTACHMENT_MIME_TYPE_PREFIX,
  IMAGE_ATTACHMENT_MIME_TYPE_PREFIX,
  PAGE_ASSET_URL_PREFIX,
  VIDEO_ATTACHMENT_MIME_TYPE_PREFIX,
} from '../constants/pages.attachments.constants';
import type { AttachmentDownload, AttachmentSummary, AttachmentUploadError } from '../types/pages.attachments.types';

export const getAttachmentUploadErrorFromResult = (result: ActionFailure): AttachmentUploadError =>
  result.validationErrors === undefined ? 'request' : 'invalid';

export const resolvePageAssetUrl = (assetId: string): string =>
  `${PAGE_ASSET_URL_PREFIX}/${encodeURIComponent(assetId)}`;

export const formatAttachmentSize = (size: number, locale: string): string => {
  const matchedUnit = ATTACHMENT_SIZE_UNITS.find((entry) => size >= entry.threshold);
  const unit = matchedUnit?.unit ?? 'byte';
  const displayValue = matchedUnit === undefined ? size : size / matchedUnit.threshold;
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1, style: 'unit', unit, unitDisplay: 'short' }).format(
    displayValue,
  );
};

export const formatAttachmentType = (mimeType: string): string => ATTACHMENT_TYPE_LABELS[mimeType] ?? mimeType;

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

/** The icon and cover images are page decoration, not attachments, so they are left out of the list. */
export const excludePageAssetAttachments = (
  attachments: readonly AttachmentSummary[],
  icon: PageIcon | null,
  cover: PageCoverValue | null = null,
): readonly AttachmentSummary[] => {
  const hiddenAssetIds = new Set<string>();
  if (icon !== null && icon.kind === 'image') hiddenAssetIds.add(icon.assetId);
  if (cover !== null) hiddenAssetIds.add(cover.assetId);
  return attachments.filter((attachment) => !hiddenAssetIds.has(attachment.id));
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
