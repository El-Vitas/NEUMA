import { beforeEach, describe, expect, it } from 'bun:test';
import { EditorView } from 'prosemirror-view';
import { createPageEditorAskCommand } from '@/modules/pages/editor/lib/pages.editor.ask.lib';
import { createEmptyPageContent, createPageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';

const DOOR_SELECTOR = '[data-page-ask-test]';

const createView = (): EditorView => {
  const container = document.createElement('div');
  document.body.append(container);
  return new EditorView(container, {
    state: createPageEditorState(createEmptyPageContent(), 'Select block', 'Insert block'),
  });
};

const openADoor = (disabled = false): HTMLButtonElement => {
  const door = document.createElement('button');
  door.setAttribute('data-page-ask-test', 'true');
  door.disabled = disabled;
  document.body.append(door);
  return door;
};

describe('createPageEditorAskCommand', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('knocks when asked to, and says it could', () => {
    const view = createView();
    const door = openADoor();
    let knocks = 0;
    door.addEventListener('click', () => {
      knocks += 1;
    });

    expect(createPageEditorAskCommand(DOOR_SELECTOR)(view.state, view.dispatch, view)).toBe(true);
    expect(knocks).toBe(1);
  });

  it('does not knock while it is only being asked whether it could', () => {
    const view = createView();
    const door = openADoor();
    let knocks = 0;
    door.addEventListener('click', () => {
      knocks += 1;
    });

    expect(createPageEditorAskCommand(DOOR_SELECTOR)(view.state, undefined, view)).toBe(true);
    expect(knocks).toBe(0);
  });

  it('says it could not when nobody is behind the door', () => {
    const view = createView();

    expect(createPageEditorAskCommand(DOOR_SELECTOR)(view.state, view.dispatch, view)).toBe(false);
  });

  it('says it could not when whoever answers cannot act', () => {
    const view = createView();
    openADoor(true);

    expect(createPageEditorAskCommand(DOOR_SELECTOR)(view.state, view.dispatch, view)).toBe(false);
  });

  it('leaves word for whoever answers before knocking', () => {
    const view = createView();
    const door = openADoor();

    createPageEditorAskCommand(DOOR_SELECTOR, (answering) => {
      answering.dataset.word = 'Acuerdos';
    })(view.state, view.dispatch, view);

    expect(door.dataset.word).toBe('Acuerdos');
  });
});
