import {
  PAGES_EXPORT_ARCHIVE_EXTENSION,
  PAGES_EXPORT_ARCHIVE_MEDIA_TYPE,
  PAGES_EXPORT_COMBINING_MARKS,
  PAGES_EXPORT_EDGE_DASHES,
  PAGES_EXPORT_FALLBACK_FILE_NAME,
  PAGES_EXPORT_FILE_EXTENSION,
  PAGES_EXPORT_MAXIMUM_NAME_LENGTH,
  PAGES_EXPORT_RUNS_OF_ANYTHING_ELSE,
  PAGES_EXPORT_TRAILING_DASHES,
} from '../constants/pages.export.constants';

/**
 * Accents and punctuation are stripped because disks, shared drives and email mangle them.
 * The extension follows the media type the backend returned, not the scope requested: only the response
 * knows whether it is one Markdown file or an archive.
 */
export const buildPagesExportFileName = (exportedName: string, mediaType: string): string => {
  const plain = exportedName
    .normalize('NFD')
    .replace(PAGES_EXPORT_COMBINING_MARKS, '')
    .toLowerCase()
    .replace(PAGES_EXPORT_RUNS_OF_ANYTHING_ELSE, '-')
    .replace(PAGES_EXPORT_EDGE_DASHES, '')
    .slice(0, PAGES_EXPORT_MAXIMUM_NAME_LENGTH)
    .replace(PAGES_EXPORT_TRAILING_DASHES, '');

  const ending = mediaType.startsWith(PAGES_EXPORT_ARCHIVE_MEDIA_TYPE)
    ? PAGES_EXPORT_ARCHIVE_EXTENSION
    : PAGES_EXPORT_FILE_EXTENSION;
  return `${plain === '' ? PAGES_EXPORT_FALLBACK_FILE_NAME : plain}${ending}`;
};
