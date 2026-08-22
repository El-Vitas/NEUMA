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
 * The name the exported file is saved under, ending as what it actually is.
 *
 * Accents and punctuation come out because the file leaves the browser and
 * lands on somebody's disk, a shared drive, or an email — places that still
 * mangle them. What stays is recognizable enough to know which page it was.
 *
 * The ending follows what the backend sent rather than what was asked for: one
 * page comes back as Markdown and several come back packed, and only the answer
 * knows which of the two happened.
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
