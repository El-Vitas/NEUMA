import { describe, expect, it } from 'bun:test';
import type { PageContent } from '@neuma/shared';
import { DOMSerializer } from 'prosemirror-model';
import { createPageEditorState, serializePageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';
import { pageEditorSchema } from '@/modules/pages/editor/lib/pages.editor.schema';

const markedPage: PageContent = {
  content: [
    {
      content: [
        { marks: [{ type: 'underline' }], text: 'subrayado', type: 'text' },
        { text: ' y ', type: 'text' },
        { marks: [{ type: 'strike' }], text: 'tachado', type: 'text' },
      ],
      type: 'paragraph',
    },
  ],
  schemaVersion: 1,
  type: 'doc',
};

describe('what the page can be written with', () => {
  it('keeps underlined and struck-through writing, in the page and in the editor alike', () => {
    const state = createPageEditorState(markedPage, 'Select', 'Insert', 'Comments', 'Write here', 'Fold');

    expect(state.doc.textContent).toBe('subrayado y tachado');
    expect(serializePageEditorState(state)).toEqual(markedPage);
  });

  it('draws an underline as its own thing, and not in the colour a link is drawn in', () => {
    const state = createPageEditorState(markedPage, 'Select', 'Insert', 'Comments', 'Write here', 'Fold');
    const drawn = document.createElement('div');
    drawn.append(DOMSerializer.fromSchema(pageEditorSchema).serializeFragment(state.doc.content));

    const underlined = drawn.querySelector('u');
    expect(underlined?.textContent).toBe('subrayado');
    expect(underlined?.className).not.toContain('primary');
    expect(drawn.querySelector('s')?.textContent).toBe('tachado');
  });
});
