export interface AttachmentSummary {
  readonly id: string;
  readonly mimeType: string;
  readonly originalFilename: string;
  readonly size: number;
}

export interface AttachmentDownload {
  readonly body: readonly number[];
  readonly mimeType: string;
  readonly originalFilename: string;
}

export type AttachmentUploadError = 'invalid' | 'request';

export interface PagesAttachmentUploadController {
  readonly clearError: () => void;
  readonly error: AttachmentUploadError | null;
  readonly isPending: boolean;
  readonly retry: () => void;
  readonly upload: (file: File | undefined) => void;
}

export interface PagesAttachmentUploadOptions {
  readonly onUploaded: (attachment: AttachmentSummary) => void;
  readonly pageId: string | null;
}
