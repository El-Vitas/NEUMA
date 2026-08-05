import type { getPageAttachments } from '../server/queries/pages.attachments.queries';

export interface AttachmentSummary {
  readonly id: string;
  readonly mimeType: string;
  readonly originalFilename: string;
  readonly size: number;
}

export type PageAttachments = Awaited<ReturnType<typeof getPageAttachments>>;

export interface AttachmentDownload {
  readonly body: readonly number[];
  readonly mimeType: string;
  readonly originalFilename: string;
}

export type AttachmentActionResult =
  | { readonly ok: true; readonly attachment: AttachmentSummary }
  | { readonly error: 'invalid' | 'request'; readonly ok: false };

export type AttachmentUploadError = Extract<AttachmentActionResult, { readonly error: string }>['error'];

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
