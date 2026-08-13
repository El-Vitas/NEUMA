import { describe, expect, it } from 'bun:test';
import type { PageContent } from '@company-brain/shared';
import { EditorView } from 'prosemirror-view';
import { createPageEditorState } from '@/modules/pages/lib/pages.editor.lib';

const emptyPage: PageContent = { content: [{ content: [], type: 'paragraph' }], schemaVersion: 1, type: 'doc' };

const writeThenSpace = (written: string): EditorView => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const view = new EditorView(container, { state: createPageEditorState(emptyPage, 'Select block') });

  view.dispatch(view.state.tr.insertText(written));
  const { from, to } = view.state.selection;
  view.someProp('handleTextInput', (handleTextInput) =>
    handleTextInput(view, from, to, ' ', () => view.state.tr.insertText(' ', from, to)),
  );
  return view;
};

const readFirstBlock = (view: EditorView): { readonly checked: unknown; readonly type: string } => {
  const block = view.state.doc.child(0);
  return { checked: block.firstChild?.attrs.checked, type: block.type.name };
};

describe('starting a task by writing it', () => {
  it('turns `[]` and a space into a task waiting to be ticked', () => {
    const view = writeThenSpace('[]');

    expect(readFirstBlock(view)).toEqual({ checked: false, type: 'task_list' });

    view.destroy();
  });

  it('answers the same to the `[ ]` of markdown', () => {
    const view = writeThenSpace('[ ]');

    expect(readFirstBlock(view).type).toBe('task_list');

    view.destroy();
  });

  it('leaves other brackets alone, which are text like any other', () => {
    const view = writeThenSpace('[x]');

    expect(readFirstBlock(view).type).toBe('paragraph');

    view.destroy();
  });
});
