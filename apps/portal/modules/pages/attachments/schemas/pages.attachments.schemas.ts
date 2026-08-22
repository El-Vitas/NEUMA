import { z } from 'zod';
import { ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_SIZE } from '../constants/pages.attachments.constants';

const allowedAttachmentMimeTypes = new Set<string>(ATTACHMENT_MIME_TYPES);

export const attachmentIdSchema = z.uuid();

export const attachmentSummarySchema = z.object({
  id: attachmentIdSchema,
  mimeType: z.string().min(1),
  originalFilename: z.string().min(1).max(255),
  size: z.number().int().positive().max(MAX_ATTACHMENT_SIZE),
  uploadedBy: z.string().min(1),
});

export const attachmentUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0 && file.size <= MAX_ATTACHMENT_SIZE, 'Invalid file size')
    .refine((file) => allowedAttachmentMimeTypes.has(file.type), 'Invalid file type'),
  pageId: attachmentIdSchema,
});
