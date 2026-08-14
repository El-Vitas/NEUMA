import type { FileAssetLifecycle } from '@company-brain/db';
import type { Result, UserRole } from '@company-brain/shared';
import type { FileAccessDeniedError, FileStorageError, FileValidationError } from '../domain/files.error';

export interface FileAssetSummary {
  readonly checksum: string;
  readonly deletedAt: Date | null;
  readonly id: string;
  readonly lifecycle: FileAssetLifecycle;
  readonly mimeType: string;
  readonly originalFilename: string;
  readonly ownerId: string;
  readonly pageId: string | null;
  readonly size: number;
  readonly storageKey: string;
  readonly workspaceId: string;
}

export interface FileAssetMetadata {
  readonly id: string;
  readonly mimeType: string;
  readonly originalFilename: string;
  readonly size: number;
}

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

/** What a reader asked for of a file: all of it, one stretch of it, or something that is not there. */
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
