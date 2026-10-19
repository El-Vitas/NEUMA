import { MAX_FILE_SIZE, MAX_FILE_SIZE_MEGABYTES } from '../domain/file.constants';

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

/** Built from the enforced limit so the message and the limit change together. */
export const FILE_TOO_LARGE_MESSAGE = `El archivo no debe superar los ${String(MAX_FILE_SIZE_MEGABYTES)} MB`;
export const FILE_TOO_LARGE_ERROR_CODE = 'FST_REQ_FILE_TOO_LARGE';

/** An upload is one file and nothing else; the defaults would accept unbounded fields and parts. */
export const MULTIPART_LIMITS = {
  fieldNameSize: 100,
  fieldSize: 1024,
  fields: 5,
  fileSize: MAX_FILE_SIZE,
  files: 1,
  headerPairs: 100,
  parts: 6,
} as const;

export const MULTIPART_LIMIT_ERROR_CODES: ReadonlySet<string> = new Set([
  'FST_FIELDS_LIMIT',
  'FST_FILES_LIMIT',
  'FST_PARTS_LIMIT',
]);
export const MULTIPART_LIMIT_MESSAGE = 'La subida trae más partes de las permitidas: envía un solo archivo';
