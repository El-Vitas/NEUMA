import { describe, expect, it } from 'bun:test';
import { pageContentSchema } from '@company-brain/shared';
import { EditorState } from 'prosemirror-state';
import {
  buildPageAssetInsertOptionsFromAttachment,
  excludePageAssetAttachments,
  formatAttachmentSize,
  formatAttachmentType,
  mapAttachmentMimeTypeToPageAssetNodeType,
} from '@/modules/pages/attachments/lib/pages.attachments.lib';
import type { AttachmentSummary } from '@/modules/pages/attachments/types/pages.attachments.types';
import { createPageAssetInsertCommand } from '@/modules/pages/editor/lib/pages.editor.commands';
import { createEmptyPageContent, serializePageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';
import { pageEditorSchema } from '@/modules/pages/editor/lib/pages.editor.schema';

describe('formatAttachmentSize', () => {
  it('formats bytes for the attachment list', () => {
    expect(formatAttachmentSize(1024, 'en')).toBe('1 kB');
    expect(formatAttachmentSize(1_048_576, 'en')).toBe('1 MB');
  });
});

describe('formatAttachmentType', () => {
  it('turns a known mime type into a short, friendly label', () => {
    expect(formatAttachmentType('application/pdf')).toBe('PDF');
    expect(formatAttachmentType('image/png')).toBe('PNG');
  });

  it('falls back to the raw mime type when there is no known label', () => {
    expect(formatAttachmentType('application/octet-stream')).toBe('application/octet-stream');
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

describe('excludePageAssetAttachments', () => {
  const iconAttachment: AttachmentSummary = {
    id: '44444444-4444-4444-8444-444444444444',
    mimeType: 'image/png',
    originalFilename: 'icon.png',
    size: 1024,
    uploadedBy: 'Jane Doe',
  };

  const regularAttachment: AttachmentSummary = {
    id: '55555555-5555-4555-8555-555555555555',
    mimeType: 'application/pdf',
    originalFilename: 'contrato.pdf',
    size: 2048,
    uploadedBy: 'Jane Doe',
  };

  it('keeps every attachment when the page has no icon', () => {
    const attachments = [iconAttachment, regularAttachment];

    expect(excludePageAssetAttachments(attachments, null)).toEqual(attachments);
  });

  it('hides the file backing the page icon', () => {
    const attachments = [iconAttachment, regularAttachment];
    const icon = { assetId: iconAttachment.id, kind: 'image' as const };

    expect(excludePageAssetAttachments(attachments, icon)).toEqual([regularAttachment]);
  });

  it('does not hide anything for an emoji icon', () => {
    const attachments = [iconAttachment, regularAttachment];
    const icon = { kind: 'emoji' as const, value: '📄' };

    expect(excludePageAssetAttachments(attachments, icon)).toEqual(attachments);
  });
});

describe('buildPageAssetInsertOptionsFromAttachment', () => {
  const imageAttachment: AttachmentSummary = {
    id: '22222222-2222-4222-8222-222222222222',
    mimeType: 'image/png',
    originalFilename: 'diagram.png',
    size: 2048,
    uploadedBy: 'Jane Doe',
  };
  const fileAttachment: AttachmentSummary = {
    id: '33333333-3333-4333-8333-333333333333',
    mimeType: 'application/pdf',
    originalFilename: 'handbook.pdf',
    size: 4096,
    uploadedBy: 'Jane Doe',
  };

  it('derives the asset id and alt text from an image attachment', () => {
    expect(buildPageAssetInsertOptionsFromAttachment(imageAttachment)).toEqual({
      alt: 'diagram.png',
      assetId: '22222222-2222-4222-8222-222222222222',
    });
  });

  it('makes something that plays out of a video and a recording', () => {
    const video = { id: 'v', mimeType: 'video/mp4', originalFilename: 'demo.mp4', size: 2048, uploadedBy: 'Jane Doe' };
    const audio = { id: 'a', mimeType: 'audio/mpeg', originalFilename: 'nota.mp3', size: 1024, uploadedBy: 'Jane Doe' };

    expect(mapAttachmentMimeTypeToPageAssetNodeType(video.mimeType)).toBe('video');
    expect(mapAttachmentMimeTypeToPageAssetNodeType(audio.mimeType)).toBe('audio');
    expect(buildPageAssetInsertOptionsFromAttachment(video)).toEqual({ assetId: 'v', caption: 'demo.mp4' });
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
