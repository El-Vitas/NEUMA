import type { FileAssetLifecycle } from '@company-brain/db';

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
  readonly uploadedBy: string;
}
