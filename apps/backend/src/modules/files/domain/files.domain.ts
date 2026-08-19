import { MAX_FILE_SIZE } from '../../../common/domain/file.constants';
import type { FileAssetMetadata, FileAssetSummary } from './files.domain.types';
import { FileValidationError } from './files.error';

const unsafeFilenameCharacters = /[^a-zA-Z0-9._-]+/g;
const filenamePathSeparators = /[\\/]/u;
const repeatedFilenameDashes = /-+/g;
const filenameEdgeCharacters = new Set(['-', '.']);

/**
 * Takes the dashes and dots off both ends of a filename.
 *
 * Written as a walk and not as a pattern because a pattern that hunts for a run
 * at the end restarts at every character, and a long enough name would keep the
 * server busy for as long as the sender cares to make it.
 */
const trimFilenameEdges = (filename: string): string => {
  let start = 0;
  let end = filename.length;
  while (start < end && filenameEdgeCharacters.has(filename.charAt(start))) start += 1;
  while (end > start && filenameEdgeCharacters.has(filename.charAt(end - 1))) end -= 1;
  return filename.slice(start, end);
};
/**
 * What a page is allowed to be given. It is a list rather than a rule so that
 * adding a kind of file is a decision someone made, and everything else is
 * refused without having to be foreseen.
 */
const allowedFileMimeTypes = new Set([
  'application/pdf',
  'application/zip',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'video/mp4',
  'video/webm',
]);

/**
 * What a page draws where it stands instead of handing over to be saved.
 *
 * A document among the writing is read where it is; the browser's own viewer
 * turns its pages and offers to save it. Handed over as something to save, it
 * never gets the chance: the page shows an empty frame and the file lands in a
 * folder nobody asked about.
 */
const filesShownInPlace = new Set(['application/pdf']);

export const describeFileDisposition = (mimeType: string, filename: string): string => {
  const handedOver = filesShownInPlace.has(mimeType.toLowerCase()) ? 'inline' : 'attachment';
  return `${handedOver}; filename*=UTF-8''${encodeURIComponent(filename)}`;
};

export const normalizeFilename = (filename: string): string => {
  const basename = filename.normalize('NFKC').split(filenamePathSeparators).pop()?.trim() ?? '';
  const collapsed = basename.replaceAll(unsafeFilenameCharacters, '-').replaceAll(repeatedFilenameDashes, '-');
  const normalized = trimFilenameEdges(collapsed.replaceAll('-.', '.'));
  if (normalized.length === 0 || normalized === '.' || normalized === '..')
    throw new FileValidationError('Filename is invalid');
  return normalized.slice(0, 255);
};

export const validateFileUpload = (input: { filename: string; mimetype: string; size: number }): string => {
  const normalizedFilename = normalizeFilename(input.filename);
  if (input.size <= 0 || input.size > MAX_FILE_SIZE) throw new FileValidationError('File size is invalid');
  if (!allowedFileMimeTypes.has(input.mimetype.toLowerCase()))
    throw new FileValidationError('File MIME type is invalid');
  return normalizedFilename;
};

/** What a page is told about a freshly uploaded file: never its storage key, owner id, or workspace. */
export const toUploadedFileAssetResponse = (asset: FileAssetSummary, uploaderName: string): FileAssetMetadata => ({
  id: asset.id,
  mimeType: asset.mimeType,
  originalFilename: asset.originalFilename,
  size: asset.size,
  uploadedBy: uploaderName,
});
