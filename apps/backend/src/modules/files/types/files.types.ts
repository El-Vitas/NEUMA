import type { Prisma } from '@neuma/db/generated';
import type { Result, UserRole } from '@neuma/shared';
import type { FILE_ASSET_METADATA_SELECTION } from '../constants/files.constants';
import type { FileAssetMetadata, FileAssetSummary } from '../domain/files.domain.types';
import type { FileAccessDeniedError, FileStorageError, FileValidationError } from '../domain/files.error';

export interface CreateFileAssetInput {
  readonly buffer: Buffer;
  readonly mimeType: string;
  readonly originalFilename: string;
  readonly ownerId: string;
  readonly pageId: string | null;
  readonly role: UserRole;
  readonly size: number;
  readonly workspaceId: string;
}

export type FileAssetMetadataRow = Prisma.FileAssetGetPayload<{ select: typeof FILE_ASSET_METADATA_SELECTION }>;

export interface FileAssetRepository {
  readonly canAttachToContent: (
    pageId: string | null,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<boolean>;
  readonly create: (input: {
    readonly checksum: string;
    readonly mimeType: string;
    readonly originalFilename: string;
    readonly ownerId: string;
    readonly pageId: string | null;
    readonly size: number;
    readonly storageKey: string;
    readonly workspaceId: string;
  }) => Promise<FileAssetSummary>;
  readonly findAccessible: (
    assetId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<FileAssetSummary | null>;
  readonly findByPage: (
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<readonly FileAssetMetadata[] | null>;
  readonly markDeleted: (assetId: string, workspaceId: string, userId: string) => Promise<boolean>;
}

export type FileByteRangeRequest =
  | { readonly end: number; readonly kind: 'part'; readonly start: number }
  | { readonly kind: 'unsatisfiable' }
  | { readonly kind: 'whole' };

export interface FileDownload {
  readonly body: Buffer;
  readonly mimeType: string;
  readonly originalFilename: string;
}

export interface FileLogger {
  readonly error: (context: Record<string, unknown>, message: string) => void;
}

export type FileOperationResult = Result<
  FileAssetSummary,
  FileAccessDeniedError | FileStorageError | FileValidationError
>;
