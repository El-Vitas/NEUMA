import { describe, expect, it } from 'bun:test';
import { pageContentSchema } from '@neuma/shared';
import { EditorState } from 'prosemirror-state';
import { createPageAssetInsertCommand } from '@/modules/pages/editor/lib/pages.editor.commands';
import { createEmptyPageContent, serializePageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';
import { pageEditorSchema } from '@/modules/pages/editor/lib/pages.editor.schema';

const emptyState = (): EditorState =>
  EditorState.create({
    doc: pageEditorSchema.nodeFromJSON(pageContentSchema.parse(createEmptyPageContent())),
    schema: pageEditorSchema,
  });

const insert = (kind: 'audio' | 'video'): EditorState => {
  const state = emptyState();
  let next = state;
  const dispatched = createPageAssetInsertCommand(pageEditorSchema, kind, {
    assetId: 'asset-1',
    caption: kind === 'video' ? 'demo.webm' : 'nota.ogg',
  })(state, (transaction) => {
    next = state.apply(transaction);
  });
  expect(dispatched).toBe(true);
  return next;
};

describe('putting something that plays on a page', () => {
  it('saves a video as something that holds nothing', () => {
    const saved = serializePageEditorState(insert('video'));

    expect(saved.content[0]).toMatchObject({ attrs: { assetId: 'asset-1' }, type: 'video' });
    expect(JSON.stringify(saved)).not.toContain('"content":[]');
  });

  it('saves a recording the same way', () => {
    const saved = serializePageEditorState(insert('audio'));

    expect(saved.content[0]).toMatchObject({ attrs: { assetId: 'asset-1' }, type: 'audio' });
    expect(pageContentSchema.safeParse(saved).success).toBe(true);
  });
});
