import { describe, expect, it } from 'bun:test';
import {
  createEmptyPageContent,
  createPageEditorState,
  isPageEditorReadOnly,
  serializePageEditorState,
} from '@/modules/pages/lib/pages.editor.lib';
import type { PageContent } from '@/modules/pages/types/pages.types';

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

  it('marks viewer and trashed pages as read-only', () => {
    expect(isPageEditorReadOnly(false)).toBe(true);
    expect(isPageEditorReadOnly(true)).toBe(false);
  });
});
