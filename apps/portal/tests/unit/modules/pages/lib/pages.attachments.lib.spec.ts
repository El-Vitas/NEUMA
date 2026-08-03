import { describe, expect, it } from 'bun:test';
import { formatAttachmentSize } from '@/modules/pages/lib/pages.attachments.lib';

describe('formatAttachmentSize', () => {
  it('formats bytes for the attachment list', () => {
    expect(formatAttachmentSize(1024)).toBe('1 KB');
    expect(formatAttachmentSize(1_048_576)).toBe('1 MB');
  });
});
