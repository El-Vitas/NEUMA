import { describe, expect, it } from 'bun:test';
import type { PageContent } from '@company-brain/shared';
import { createPageEditorState, serializePageEditorState } from '@/modules/pages/lib/pages.editor.lib';
import { pageEditorSchema } from '@/modules/pages/lib/pages.editor.schema';
import { createPageSubpageInsertCommand, readPageTitleFrom } from '@/modules/pages/lib/pages.editor.subpage.lib';

const emptyPage: PageContent = {
  content: [{ content: [], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
};

describe('createPageSubpageInsertCommand', () => {
  it('leaves the line that leads to the child page, keeping which page it is', () => {
    const state = createPageEditorState(emptyPage, 'Select', 'Insert', 'Comments', 'Write here', 'Fold');
    const insert = createPageSubpageInsertCommand(pageEditorSchema, {
      label: 'Hija',
      pageId: 'page-2',
      spaceId: 'space-1',
    });
    let kept: PageContent | null = null;

    const ran = insert(state, (transaction) => {
      kept = serializePageEditorState(state.apply(transaction));
    });

    expect(ran).toBe(true);
    expect(kept).not.toBeNull();
    expect(JSON.stringify(kept)).toContain('"type":"subpage"');
    expect(JSON.stringify(kept)).toContain('"pageId":"page-2"');
  });
});

describe('readPageTitleFrom', () => {
  it('says what a page is called now, and says nothing about one it does not know', () => {
    const pages = [
      { id: 'page-1', title: 'Madre' },
      { id: 'page-2', title: 'Hija con nombre' },
    ];

    expect(readPageTitleFrom(pages, 'page-2')).toBe('Hija con nombre');
    expect(readPageTitleFrom(pages, 'page-9')).toBeNull();
  });
});
