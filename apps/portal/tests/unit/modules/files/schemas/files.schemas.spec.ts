import { describe, expect, it } from 'bun:test';
import {
  attachmentIdSchema,
  attachmentUploadSchema,
} from '@/modules/pages/attachments/schemas/pages.attachments.schemas';

const pageId = '11111111-1111-4111-8111-111111111111';
const attachmentId = '22222222-2222-4222-8222-222222222222';

describe('attachmentIdSchema', () => {
  it('accepts UUID attachment identifiers', () => {
    expect(attachmentIdSchema.safeParse(attachmentId).success).toBe(true);
  });

  it('rejects path traversal and non-UUID identifiers', () => {
    expect(attachmentIdSchema.safeParse('../secret').success).toBe(false);
    expect(attachmentIdSchema.safeParse('attachment/one').success).toBe(false);
  });
});

describe('attachmentUploadSchema', () => {
  it('accepts a page target and a file', () => {
    const result = attachmentUploadSchema.safeParse({
      file: new File(['report'], 'report.txt', { type: 'text/plain' }),
      pageId,
    });

    expect(result.success).toBe(true);
  });

  it('rejects uploads without a file or with an unsafe page id', () => {
    expect(attachmentUploadSchema.safeParse({ pageId }).success).toBe(false);
    expect(
      attachmentUploadSchema.safeParse({
        file: new File(['report'], 'report.txt', { type: 'text/plain' }),
        pageId: '../page',
      }).success,
    ).toBe(false);
  });
});
