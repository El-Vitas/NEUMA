export const UNSAFE_FILENAME_CHARACTERS = /[^a-zA-Z0-9._-]+/g;
export const FILENAME_PATH_SEPARATORS = /[\\/]/u;
export const REPEATED_FILENAME_DASHES = /-+/g;
export const FILENAME_EDGE_CHARACTERS: ReadonlySet<string> = new Set(['-', '.']);
export const FILENAME_MAX_LENGTH = 255;

/**
 * What a page is allowed to be given. It is a list rather than a rule so that
 * adding a kind of file is a decision someone made, and everything else is
 * refused without having to be foreseen.
 */
export const ALLOWED_FILE_MIME_TYPES: ReadonlySet<string> = new Set([
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
export const FILES_SHOWN_IN_PLACE: ReadonlySet<string> = new Set(['application/pdf']);
