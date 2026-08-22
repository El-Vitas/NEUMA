import { describe, expect, it } from 'bun:test';
import type { PageContent } from '@company-brain/shared';
import { createPageEditorState, serializePageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';
import { pageEditorSchema } from '@/modules/pages/editor/lib/pages.editor.schema';
import {
  createPageSubpageInsertCommand,
  readPageLifecycleFrom,
  readPageTitleFrom,
} from '@/modules/pages/editor/structure/lib/pages.editor.subpage.lib';

const emptyPage: PageContent = {
  content: [{ content: [], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
};

describe('createPageSubpageInsertCommand', () => {
  it('leaves the line that leads to the child page, keeping which page it is', () => {
    const state = createPageEditorState(emptyPage, 'Select', 'Insert', 'Comments', 'Write here', 'Fold');
    const insert = createPageSubpageInsertCommand(
      pageEditorSchema,
      { label: 'Hija', pageId: 'page-2', spaceId: 'space-1' },
      state.selection.from,
    );
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

describe('readPageLifecycleFrom', () => {
  it('says whether a page mentioned here is still one, and says nothing about one it does not know', () => {
    const pages = [
      { id: 'page-1', lifecycle: 'ACTIVE' as const },
      { id: 'page-2', lifecycle: 'TRASHED' as const },
    ];

    expect(readPageLifecycleFrom(pages, 'page-1')).toBe('ACTIVE');
    expect(readPageLifecycleFrom(pages, 'page-2')).toBe('TRASHED');
    expect(readPageLifecycleFrom(pages, 'page-9')).toBeNull();
  });
});
