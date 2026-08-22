import { describe, expect, it } from 'bun:test';
import type { PageContent } from '@company-brain/shared';
import { createPageEditorState, serializePageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';
import {
  createPageButtonWriteCommand,
  readThePressedButton,
  readTheRowContent,
  readTheRowTitle,
} from '@/modules/pages/editor/structure/lib/pages.editor.button.lib';

const pageWithAButton = (place: string): PageContent => ({
  content: [
    { content: [{ text: 'Lo que ya estaba', type: 'text' }], type: 'paragraph' },
    {
      attrs: { id: 'block-button', label: 'Agregar tarea', place },
      content: [
        { attrs: { id: 'block-written' }, content: [{ text: 'Tarea nueva', type: 'text' }], type: 'paragraph' },
      ],
      type: 'button',
    },
  ],
  schemaVersion: 1,
  type: 'doc',
});

const stateOf = (content: PageContent) =>
  createPageEditorState(content, 'Select', 'Insert', 'Comments', 'Write here', 'Fold');

const pressAt = (content: PageContent) => {
  const state = stateOf(content);
  const at = state.doc.child(0).nodeSize;
  const pressed = readThePressedButton(state, at);
  return { pressed, state };
};

describe('createPageButtonWriteCommand', () => {
  it('writes what the button holds under it, as writing of its own and not as the block inside', () => {
    const { pressed, state } = pressAt(pageWithAButton('below'));
    let kept: PageContent | null = null;

    expect(pressed).not.toBeNull();
    if (pressed !== null) {
      createPageButtonWriteCommand(pressed)(state, (transaction) => {
        kept = serializePageEditorState(state.apply(transaction));
      });
    }

    const written = JSON.stringify(kept);
    expect(written.split('Tarea nueva').length - 1).toBe(2);
    expect(written.split('block-written').length - 1).toBe(1);
  });

  it('writes at the top of the page when that is where the button says', () => {
    const { pressed, state } = pressAt(pageWithAButton('top'));
    let written = '';

    if (pressed !== null) {
      createPageButtonWriteCommand(pressed)(state, (transaction) => {
        written = JSON.stringify(serializePageEditorState(state.apply(transaction)).content[0]);
      });
    }

    expect(written).toContain('"type":"paragraph"');
    expect(written).toContain('Tarea nueva');
  });
});

describe('what a button makes of a row', () => {
  it('names the row after the first thing the button would have written', () => {
    const { pressed } = pressAt(pageWithAButton('below'));

    expect(pressed).not.toBeNull();
    if (pressed === null) return;
    expect(readTheRowTitle(pressed.content, 'Sin título')).toBe('Tarea nueva');
    expect(readTheRowContent(pressed.content).content).toHaveLength(1);
  });
});
