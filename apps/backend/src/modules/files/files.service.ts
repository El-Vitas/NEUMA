import { createHash, randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import { Result, USER_ROLE, type UserRole } from '@neuma/shared';
import { Logger } from 'nestjs-pino';
import { STORAGE_PROVIDER } from '../../common/constants/storage.constants';
import type { IStorageProvider } from '../../common/types/storage.types';
import { FILE_ASSET_REPOSITORY } from './constants/files.constants';
import { validateFileUpload } from './domain/files.domain';
import type { FileAssetMetadata, FileAssetSummary } from './domain/files.domain.types';
import { FileAccessDeniedError, FileStorageError, FileValidationError } from './domain/files.error';
import type { CreateFileAssetInput, FileAssetRepository, FileDownload, FileLogger } from './types/files.types';

@Injectable()
export class FilesService {
  constructor(
    @Inject(FILE_ASSET_REPOSITORY) private readonly fileAssetRepository: FileAssetRepository,
    @Inject(STORAGE_PROVIDER) private readonly storageProvider: IStorageProvider,
    @Inject(Logger) private readonly logger: FileLogger,
  ) {}

  async create(
    input: CreateFileAssetInput,
  ): Promise<Result<FileAssetSummary, FileAccessDeniedError | FileStorageError | FileValidationError>> {
    if (input.role === USER_ROLE.CLIENT) return Result.fail(new FileAccessDeniedError());
    let normalizedFilename: string;
    try {
      normalizedFilename = validateFileUpload({
        filename: input.originalFilename,
        mimetype: input.mimeType,
        size: input.size,
      });
    } catch (error) {
      if (error instanceof FileValidationError) return Result.fail(error);
      throw error;
    }
    if (input.pageId === null) return Result.fail(new FileValidationError('Content target is required'));
    const canAttach = await this.fileAssetRepository.canAttachToContent(
      input.pageId,
      input.workspaceId,
      input.ownerId,
      input.role,
    );
    if (!canAttach) return Result.fail(new FileAccessDeniedError());
    const storageKey = `${randomUUID()}${extname(normalizedFilename)}`;
    const checksum = createHash('sha256').update(input.buffer).digest('hex');
    try {
      await this.storageProvider.save(input.buffer, storageKey, input.mimeType);
      const asset = await this.fileAssetRepository.create({
        checksum,
        mimeType: input.mimeType,
        originalFilename: normalizedFilename,
        ownerId: input.ownerId,
        pageId: input.pageId,
        size: input.size,
        storageKey,
        workspaceId: input.workspaceId,
      });
      return Result.ok(asset);
    } catch (error) {
      this.reportStorageFailure('file_asset_create', error);
      await this.deleteStoredAsset(storageKey);
      return Result.fail(new FileStorageError());
    }
  }

  async download(
    assetId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<FileDownload, FileAccessDeniedError | FileStorageError>> {
    const asset = await this.fileAssetRepository.findAccessible(assetId, workspaceId, userId, role);
    if (asset === null) return Result.fail(new FileAccessDeniedError());
    try {
      return Result.ok({
        body: await this.storageProvider.read(asset.storageKey),
        mimeType: asset.mimeType,
        originalFilename: asset.originalFilename,
      });
    } catch (error) {
      this.reportStorageFailure('file_asset_download', error);
      return Result.fail(new FileStorageError());
    }
  }

  async listByPage(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<readonly FileAssetMetadata[], FileAccessDeniedError>> {
    const assets = await this.fileAssetRepository.findByPage(pageId, workspaceId, userId, role);
    if (assets === null) return Result.fail(new FileAccessDeniedError());
    return Result.ok(assets);
  }

  async delete(
    assetId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<true, FileAccessDeniedError | FileStorageError>> {
    if (role === USER_ROLE.CLIENT) return Result.fail(new FileAccessDeniedError());
    const asset = await this.fileAssetRepository.findDeletable(assetId, workspaceId, userId, role);
    if (asset === null) return Result.fail(new FileAccessDeniedError());
    const markedDeleted = await this.fileAssetRepository.markDeleted(assetId, workspaceId, userId);
    if (!markedDeleted) return Result.fail(new FileAccessDeniedError());
    try {
      await this.storageProvider.delete(asset.storageKey);
      return Result.ok(true);
    } catch (error) {
      this.reportStorageFailure('file_asset_delete', error);
      return Result.fail(new FileStorageError());
    }
  }

  private async deleteStoredAsset(storageKey: string): Promise<void> {
    try {
      await this.storageProvider.delete(storageKey);
    } catch (error) {
      this.reportStorageFailure('file_asset_storage_cleanup', error);
    }
  }

  private reportStorageFailure(operation: string, error: unknown): void {
    this.logger.error(
      {
        errorType: error instanceof Error ? error.name : 'UnknownError',
        operation,
      },
      'File asset storage operation failed',
    );
  }
}
