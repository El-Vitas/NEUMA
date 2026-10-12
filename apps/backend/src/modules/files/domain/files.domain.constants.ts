export const UNSAFE_FILENAME_CHARACTERS = /[^a-zA-Z0-9._-]+/g;
export const FILENAME_PATH_SEPARATORS = /[\\/]/u;
export const REPEATED_FILENAME_DASHES = /-+/g;
export const FILENAME_EDGE_CHARACTERS: ReadonlySet<string> = new Set(['-', '.']);
export const FILENAME_MAX_LENGTH = 255;

/** Allowlist: a new kind of file is an explicit decision, everything else is refused. */
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

/** Served inline: as an attachment the page would show an empty frame and the file would be downloaded. */
export const FILES_SHOWN_IN_PLACE: ReadonlySet<string> = new Set(['application/pdf']);
