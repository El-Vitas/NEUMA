import { describe, expect, it } from 'bun:test';
import { pageContentSchema } from '@company-brain/shared';
import { EditorState } from 'prosemirror-state';
import {
  buildPageAssetInsertOptionsFromAttachment,
  formatAttachmentSize,
  mapAttachmentMimeTypeToPageAssetNodeType,
} from '@/modules/pages/lib/pages.attachments.lib';
import { createPageAssetInsertCommand } from '@/modules/pages/lib/pages.editor.commands';
import { createEmptyPageContent, serializePageEditorState } from '@/modules/pages/lib/pages.editor.lib';
import { pageEditorSchema } from '@/modules/pages/lib/pages.editor.schema';
import type { AttachmentSummary } from '@/modules/pages/types/pages.attachments.types';

describe('formatAttachmentSize', () => {
  it('formats bytes for the attachment list', () => {
    expect(formatAttachmentSize(1024)).toBe('1 KB');
    expect(formatAttachmentSize(1_048_576)).toBe('1 MB');
  });
});

describe('mapAttachmentMimeTypeToPageAssetNodeType', () => {
  it('maps every allowed image mime type to the image node type', () => {
    expect(mapAttachmentMimeTypeToPageAssetNodeType('image/png')).toBe('image');
    expect(mapAttachmentMimeTypeToPageAssetNodeType('image/jpeg')).toBe('image');
    expect(mapAttachmentMimeTypeToPageAssetNodeType('image/gif')).toBe('image');
    expect(mapAttachmentMimeTypeToPageAssetNodeType('image/webp')).toBe('image');
  });

  it('maps every allowed non-image mime type to the file node type', () => {
    expect(mapAttachmentMimeTypeToPageAssetNodeType('application/pdf')).toBe('file');
    expect(mapAttachmentMimeTypeToPageAssetNodeType('application/zip')).toBe('file');
    expect(mapAttachmentMimeTypeToPageAssetNodeType('text/plain')).toBe('file');
  });
});

describe('buildPageAssetInsertOptionsFromAttachment', () => {
  const imageAttachment: AttachmentSummary = {
    id: '22222222-2222-4222-8222-222222222222',
    mimeType: 'image/png',
    originalFilename: 'diagram.png',
    size: 2048,
  };
  const fileAttachment: AttachmentSummary = {
    id: '33333333-3333-4333-8333-333333333333',
    mimeType: 'application/pdf',
    originalFilename: 'handbook.pdf',
    size: 4096,
  };

  it('derives the asset id and alt text from an image attachment', () => {
    expect(buildPageAssetInsertOptionsFromAttachment(imageAttachment)).toEqual({
      alt: 'diagram.png',
      assetId: '22222222-2222-4222-8222-222222222222',
    });
  });

  /** A file says what kind it is and how heavy on the block itself, so the page describes what it holds. */
  it('derives the asset id, name, kind and weight from a non-image attachment', () => {
    expect(buildPageAssetInsertOptionsFromAttachment(fileAttachment)).toEqual({
      assetId: '33333333-3333-4333-8333-333333333333',
      caption: 'handbook.pdf',
      mimeType: 'application/pdf',
      size: 4096,
    });
  });

  it('produces attrs that createPageAssetInsertCommand accepts and that round-trip through the shared contract', () => {
    const nodeType = mapAttachmentMimeTypeToPageAssetNodeType(imageAttachment.mimeType);
    const options = buildPageAssetInsertOptionsFromAttachment(imageAttachment);
    const run = createPageAssetInsertCommand(pageEditorSchema, nodeType, options);

    const state = EditorState.create({
      doc: pageEditorSchema.nodeFromJSON(pageContentSchema.parse(createEmptyPageContent())),
      schema: pageEditorSchema,
    });
    let nextState = state;
    const dispatched = run(state, (transaction) => {
      nextState = state.apply(transaction);
    });

    expect(dispatched).toBe(true);
    const content = serializePageEditorState(nextState);
    expect(pageContentSchema.safeParse(content).success).toBe(true);
    expect(content.content[0]).toEqual({
      attrs: { alt: 'diagram.png', assetId: '22222222-2222-4222-8222-222222222222' },
      type: 'image',
    });
  });
});
