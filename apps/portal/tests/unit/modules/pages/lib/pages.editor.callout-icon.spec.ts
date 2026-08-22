import { describe, expect, it } from 'bun:test';
import type { PageContent } from '@company-brain/shared';
import type { EditorState } from 'prosemirror-state';
import { NodeSelection } from 'prosemirror-state';
import { createPageEditorState, serializePageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';
import {
  createPageEditorCalloutIconCommand,
  readPageEditorCalloutIcon,
} from '@/modules/pages/editor/structure/lib/pages.editor.callout-icon.lib';

const calloutPage = (icon?: string): PageContent =>
  ({
    content: [
      {
        attrs: icon === undefined ? {} : { icon },
        content: [{ content: [{ text: 'Un aviso', type: 'text' }], type: 'paragraph' }],
        type: 'callout',
      },
    ],
    schemaVersion: 1,
    type: 'doc',
  }) as PageContent;

const paragraphPage: PageContent = {
  content: [{ content: [{ text: 'Suelto', type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
} as PageContent;

const withTheBlockSelected = (content: PageContent): EditorState => {
  const state = createPageEditorState(content, 'Select block');
  return state.apply(state.tr.setSelection(NodeSelection.create(state.doc, 0)));
};

const run = (state: EditorState, icon: string | null): EditorState | null => {
  let next: EditorState | null = null;
  createPageEditorCalloutIconCommand(icon)(state, (transaction) => {
    next = state.apply(transaction);
  });
  return next;
};

describe('the mark a callout carries', () => {
  it('is nothing until one is chosen', () => {
    expect(readPageEditorCalloutIcon(withTheBlockSelected(calloutPage()))).toBeNull();
  });

  it('is read back from the block once it carries one', () => {
    expect(readPageEditorCalloutIcon(withTheBlockSelected(calloutPage('warning')))).toBe('warning');
  });

  it('says nothing about a block that is not a callout, so nothing is offered for it', () => {
    expect(readPageEditorCalloutIcon(withTheBlockSelected(paragraphPage))).toBeNull();
  });
});

describe('choosing the mark of a callout', () => {
  it('writes it into the block, where the page keeps it', () => {
    const next = run(withTheBlockSelected(calloutPage()), 'warning');
    if (next === null) throw new Error('the mark was not written');

    expect(next.doc.child(0).attrs.icon).toBe('warning');
    expect(serializePageEditorState(next).content[0]).toMatchObject({ attrs: { icon: 'warning' }, type: 'callout' });
  });

  it('takes it off again when none is chosen', () => {
    const next = run(withTheBlockSelected(calloutPage('warning')), null);
    if (next === null) throw new Error('the mark was not taken off');

    expect(next.doc.child(0).attrs.icon).toBeNull();
    expect(serializePageEditorState(next).content[0]).not.toMatchObject({ attrs: { icon: 'warning' } });
  });

  it('leaves alone a block that is not a callout', () => {
    expect(run(withTheBlockSelected(paragraphPage), 'warning')).toBeNull();
  });
});
