import { MAX_FILE_SIZE_MEGABYTES } from '../domain/file.constants';

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

/** Said with the same number the limit is enforced with, so raising one raises the other. */
export const FILE_TOO_LARGE_MESSAGE = `El archivo no debe superar los ${String(MAX_FILE_SIZE_MEGABYTES)} MB`;
export const FILE_TOO_LARGE_ERROR_CODE = 'FST_REQ_FILE_TOO_LARGE';
