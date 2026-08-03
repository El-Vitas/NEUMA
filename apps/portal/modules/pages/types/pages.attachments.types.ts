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

export type AttachmentActionResult =
  | { readonly ok: true; readonly attachment: AttachmentSummary }
  | { readonly error: 'invalid' | 'request'; readonly ok: false };

export type AttachmentDeleteResult =
  | { readonly ok: true }
  | { readonly error: 'invalid' | 'request'; readonly ok: false };

export type AttachmentDownloadResult =
  | { readonly download: AttachmentDownload; readonly ok: true }
  | { readonly error: 'invalid' | 'request'; readonly ok: false };
