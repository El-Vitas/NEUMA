import { MAX_FILE_SIZE } from '../../../common/domain/file.constants';
import { FileValidationError } from './files.error';

const unsafeFilenameCharacters = /[^a-zA-Z0-9._-]+/g;
const filenamePathSeparators = /[\\/]/u;
const allowedFileMimeTypes = new Set([
  'application/pdf',
  'application/zip',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
]);

export const normalizeFilename = (filename: string): string => {
  const basename = filename.normalize('NFKC').split(filenamePathSeparators).pop()?.trim() ?? '';
  const normalized = basename
    .replaceAll(unsafeFilenameCharacters, '-')
    .replace(/-+/g, '-')
    .replace(/-+\./g, '.')
    .replace(/^[-.]+|[-.]+$/g, '');
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
