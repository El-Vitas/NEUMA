import { MAX_FILE_SIZE } from '../../../common/domain/file.constants';
import {
  ALLOWED_FILE_MIME_TYPES,
  FILENAME_EDGE_CHARACTERS,
  FILENAME_MAX_LENGTH,
  FILENAME_PATH_SEPARATORS,
  FILES_SHOWN_IN_PLACE,
  REPEATED_FILENAME_DASHES,
  UNSAFE_FILENAME_CHARACTERS,
} from './files.domain.constants';
import type { FileAssetMetadata, FileAssetSummary } from './files.domain.types';
import { FileValidationError } from './files.error';

/** Index scan instead of a regex: an end-anchored pattern backtracks, so a long name could tie up the server. */
const trimFilenameEdges = (filename: string): string => {
  let start = 0;
  let end = filename.length;
  while (start < end && FILENAME_EDGE_CHARACTERS.has(filename.charAt(start))) start += 1;
  while (end > start && FILENAME_EDGE_CHARACTERS.has(filename.charAt(end - 1))) end -= 1;
  return filename.slice(start, end);
};

export const describeFileDisposition = (mimeType: string, filename: string): string => {
  const handedOver = FILES_SHOWN_IN_PLACE.has(mimeType.toLowerCase()) ? 'inline' : 'attachment';
  return `${handedOver}; filename*=UTF-8''${encodeURIComponent(filename)}`;
};

export const normalizeFilename = (filename: string): string => {
  const basename = filename.normalize('NFKC').split(FILENAME_PATH_SEPARATORS).pop()?.trim() ?? '';
  const collapsed = basename.replaceAll(UNSAFE_FILENAME_CHARACTERS, '-').replaceAll(REPEATED_FILENAME_DASHES, '-');
  const normalized = trimFilenameEdges(collapsed.replaceAll('-.', '.'));
  if (normalized.length === 0 || normalized === '.' || normalized === '..')
    throw new FileValidationError('Filename is invalid');
  return normalized.slice(0, FILENAME_MAX_LENGTH);
};

export const validateFileUpload = (input: { filename: string; mimetype: string; size: number }): string => {
  const normalizedFilename = normalizeFilename(input.filename);
  if (input.size <= 0 || input.size > MAX_FILE_SIZE) throw new FileValidationError('File size is invalid');
  if (!ALLOWED_FILE_MIME_TYPES.has(input.mimetype.toLowerCase()))
    throw new FileValidationError('File MIME type is invalid');
  return normalizedFilename;
};

/** Never exposes the storage key, owner id or workspace. */
export const toUploadedFileAssetResponse = (asset: FileAssetSummary, uploaderName: string): FileAssetMetadata => ({
  id: asset.id,
  mimeType: asset.mimeType,
  originalFilename: asset.originalFilename,
  size: asset.size,
  uploadedBy: uploaderName,
});
