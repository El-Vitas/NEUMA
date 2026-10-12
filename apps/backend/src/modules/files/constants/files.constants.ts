import type { FileByteRangeRequest } from '../types/files.types';

export const FILE_ASSET_REPOSITORY = Symbol('FILE_ASSET_REPOSITORY');

export const FILE_ASSET_METADATA_FIELDS = ['id', 'mimeType', 'originalFilename', 'ownerId', 'size'] as const;

export const FILE_ASSET_FIELDS = [
  'checksum',
  'deletedAt',
  'id',
  'lifecycle',
  'mimeType',
  'originalFilename',
  'ownerId',
  'pageId',
  'size',
  'storageKey',
  'workspaceId',
] as const;

/** One stretch of bytes and no more: `bytes=0-499`, `bytes=500-`, `bytes=-500`. */
export const FILE_BYTE_RANGE_PATTERN = /^bytes=(\d*)-(\d*)$/;

export const FILE_PARTIAL_CONTENT_STATUS = 206;

export const FILE_RANGE_WHOLE: FileByteRangeRequest = { kind: 'whole' };

export const FILE_RANGE_UNSATISFIABLE: FileByteRangeRequest = { kind: 'unsatisfiable' };

export const FILE_RANGE_NOT_SATISFIABLE_STATUS = 416;

export const UNKNOWN_FILE_OWNER_NAME = 'Unknown';
