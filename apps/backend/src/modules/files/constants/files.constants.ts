import type { FileByteRangeRequest } from '../types/files.types';

export const FILE_ASSET_REPOSITORY = Symbol('FILE_ASSET_REPOSITORY');

/** One stretch of bytes and no more: `bytes=0-499`, `bytes=500-`, `bytes=-500`. */
export const FILE_BYTE_RANGE_PATTERN = /^bytes=(\d*)-(\d*)$/;

export const FILE_PARTIAL_CONTENT_STATUS = 206;

export const FILE_RANGE_WHOLE: FileByteRangeRequest = { kind: 'whole' };

export const FILE_RANGE_UNSATISFIABLE: FileByteRangeRequest = { kind: 'unsatisfiable' };

export const FILE_RANGE_NOT_SATISFIABLE_STATUS = 416;
