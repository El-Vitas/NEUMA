import { describe, expect, it } from 'bun:test';
import {
  computeSelectionToolbarPlacement,
  createEmptyPageContent,
  createPageEditorState,
  isPageEditorReadOnly,
  serializePageEditorState,
} from '@/modules/pages/lib/pages.editor.lib';
import type { PageContent } from '@/modules/pages/types/pages.types';
import { structuredEmbedNodeFixture, structuredToggleNodeFixture } from './pages.content.fixture';

const content: PageContent = {
  content: [
    {
      attrs: { level: 2 },
      content: [{ text: 'Título', type: 'text' }],
      type: 'heading',
    },
    {
      content: [
        {
          content: [{ text: 'Texto', type: 'text' }],
          type: 'paragraph',
        },
      ],
      type: 'blockquote',
    },
  ],
  schemaVersion: 1,
  type: 'doc',
};

describe('pages.editor.lib', () => {
  it('creates initial editor state from validated page JSON', () => {
    const state = createPageEditorState(content);

    expect(state.doc.toJSON()).toMatchObject({ type: 'doc' });
    expect(state.doc.child(0).type.name).toBe('heading');
  });

  it('creates a valid empty document for a new page', () => {
    const emptyContent = createEmptyPageContent();

    expect(serializePageEditorState(createPageEditorState(emptyContent))).toEqual(emptyContent);
  });

  it('serializes editor state back to the shared PageContent contract', () => {
    const state = createPageEditorState(content);

    expect(serializePageEditorState(state)).toEqual(content);
  });

  it('preserves supported inline marks during serialization', () => {
    const richContent: PageContent = {
      content: [
        {
          content: [
            {
              marks: [
                { type: 'code' },
                { type: 'em' },
                { attrs: { href: 'https://example.com' }, type: 'link' },
                { type: 'strong' },
              ],
              text: 'Enlace',
              type: 'text',
            },
          ],
          type: 'paragraph',
        },
      ],
      schemaVersion: 1,
      type: 'doc',
    };

    expect(serializePageEditorState(createPageEditorState(richContent))).toEqual(richContent);
  });

  it('preserves structured blocks and marks during serialization', () => {
    const structuredContent: PageContent = {
      content: [
        {
          content: [
            {
              content: [
                {
                  content: [
                    {
                      content: [{ marks: [{ type: 'strong' }], text: 'Cell', type: 'text' }],
                      type: 'paragraph',
                    },
                  ],
                  type: 'table_cell',
                },
              ],
              type: 'table_row',
            },
          ],
          type: 'table',
        },
        structuredToggleNodeFixture,
        { attrs: { alt: 'Image', assetId: 'asset-1' }, type: 'image' },
        { attrs: { assetId: 'asset-2', caption: 'File' }, type: 'file' },
        structuredEmbedNodeFixture,
      ],
      schemaVersion: 1,
      type: 'doc',
    };

    expect(serializePageEditorState(createPageEditorState(structuredContent))).toEqual(structuredContent);
  });

  it('marks viewer and trashed pages as read-only', () => {
    expect(isPageEditorReadOnly(false)).toBe(true);
    expect(isPageEditorReadOnly(true)).toBe(false);
  });
});

describe('computeSelectionToolbarPlacement', () => {
  const surfaceRect = { left: 100, top: 200, width: 800 };

  it('flips below the selection when there is not enough room above it, so a selection on the first line stays visible', () => {
    const selectionCoords = { bottom: 220, left: 140, right: 260, top: 204 };

    const placement = computeSelectionToolbarPlacement({
      selectionEndCoords: selectionCoords,
      selectionStartCoords: selectionCoords,
      surfaceRect,
      toolbarHeight: 44,
      toolbarWidth: 220,
    });

    expect(placement.placement).toBe('below');
    expect(placement.top).toBeGreaterThanOrEqual(0);
    expect(placement.top).toBe(28);
  });

  it('renders above the selection when there is enough room above it', () => {
    const selectionCoords = { bottom: 420, left: 140, right: 260, top: 404 };

    const placement = computeSelectionToolbarPlacement({
      selectionEndCoords: selectionCoords,
      selectionStartCoords: selectionCoords,
      surfaceRect,
      toolbarHeight: 44,
      toolbarWidth: 220,
    });

    expect(placement.placement).toBe('above');
    expect(placement.top).toBeGreaterThanOrEqual(0);
    expect(placement.top).toBe(152);
  });

  it('spans the bounding box of a multi-line selection instead of only the caret position', () => {
    const placement = computeSelectionToolbarPlacement({
      selectionEndCoords: { bottom: 460, left: 120, right: 180, top: 440 },
      selectionStartCoords: { bottom: 420, left: 500, right: 560, top: 404 },
      surfaceRect,
      toolbarHeight: 44,
      toolbarWidth: 220,
    });

    expect(placement.placement).toBe('above');
    expect(placement.top).toBe(404 - surfaceRect.top - 44 - 8);
  });

  it('clamps the toolbar so a selection near the left edge does not overflow the surface', () => {
    const selectionCoords = { bottom: 420, left: 102, right: 110, top: 404 };

    const placement = computeSelectionToolbarPlacement({
      selectionEndCoords: selectionCoords,
      selectionStartCoords: selectionCoords,
      surfaceRect,
      toolbarHeight: 44,
      toolbarWidth: 220,
    });

    expect(placement.left).toBe(8);
  });

  it('clamps the toolbar so a selection near the right edge does not overflow the surface', () => {
    const selectionCoords = { bottom: 420, left: 890, right: 898, top: 404 };

    const placement = computeSelectionToolbarPlacement({
      selectionEndCoords: selectionCoords,
      selectionStartCoords: selectionCoords,
      surfaceRect,
      toolbarHeight: 44,
      toolbarWidth: 220,
    });

    expect(placement.left).toBe(surfaceRect.width - 220 - 8);
  });
});
