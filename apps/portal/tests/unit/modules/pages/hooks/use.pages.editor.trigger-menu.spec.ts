import { describe, expect, it, mock } from 'bun:test';
import type { PageContent, PageContentNode } from '@neuma/shared';
import { act, renderHook, waitFor } from '@testing-library/react';
import { TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import en from '../../../../../messages/en.json';

const resolveEnglishTranslation = (key: string): string => {
  const node = key
    .split('.')
    .reduce<unknown>(
      (current, segment) =>
        typeof current === 'object' && current !== null ? (current as Record<string, unknown>)[segment] : undefined,
      en.pages,
    );
  return typeof node === 'string' ? node : key;
};

mock.module('next-intl', () => ({
  useTranslations: () => resolveEnglishTranslation,
}));

mock.module('@/modules/pages/links/server/actions/pages.mentions.actions', () => ({
  searchPageMentionCandidatesAction: async () => ({ data: [] }),
}));

const searchPagePersonCandidatesAction = mock(async (_input: { readonly query: string; readonly spaceId: string }) => ({
  data: [{ email: 'ana@example.com', id: '9f5d6c3a-1b2e-4a3d-8f6b-2c1a9d0e7f4b', name: 'Ana' }],
}));

mock.module('@/modules/pages/links/server/actions/pages.person.actions', () => ({
  searchPagePersonCandidatesAction,
}));

const { usePagesEditorTriggerMenu } = await import('@/modules/pages/editor/menus/hooks/use.pages.editor.trigger-menu');
const { createPageEditorState } = await import('@/modules/pages/editor/lib/pages.editor.lib');

const paragraph = (text: string): PageContentNode => ({
  content: text.length === 0 ? [] : [{ text, type: 'text' }],
  type: 'paragraph',
});

const mountEditor = (): EditorView => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const pageContent: PageContent = { content: [paragraph('Placeholder text')], schemaVersion: 1, type: 'doc' };
  return new EditorView(container, { state: createPageEditorState(pageContent, 'Select block', 'Insert block') });
};

const putCursorAt = (editorView: EditorView, position: number): void => {
  editorView.dispatch(editorView.state.tr.setSelection(TextSelection.create(editorView.state.doc, position)));
};

const selectRange = (editorView: EditorView, from: number, to: number): void => {
  editorView.dispatch(editorView.state.tr.setSelection(TextSelection.create(editorView.state.doc, from, to)));
};

const keyDown = (key: string): KeyboardEvent => new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key });

const renderTriggerMenu = (spaceId = 'space-1') => {
  const editorViewRef: { current: EditorView | null } = { current: mountEditor() };
  const surfaceRef: { current: HTMLDivElement | null } = { current: null };
  const escapedSelections: EditorView[] = [];
  const rendered = renderHook(() =>
    usePagesEditorTriggerMenu({
      canMakeAPage: true,
      editorViewRef,
      onEscapeWithSelection: (editorView) => escapedSelections.push(editorView),
      pagesAtHand: [],
      spaceId,
      surfaceRef,
    }),
  );
  const editorView = editorViewRef.current;
  if (editorView === null) throw new Error('the test editor failed to mount');
  return { editorView, escapedSelections, ...rendered };
};

const openTriggerMenu = (
  result: { readonly current: ReturnType<typeof usePagesEditorTriggerMenu> },
  text: string,
): void => {
  act(() => {
    result.current.updateEditorTrigger(text);
    result.current.rememberTriggerMenuPosition({ left: 0, top: 0 });
  });
};

describe('opening a trigger', () => {
  it('lists every block command once the slash has been typed', () => {
    const { result } = renderTriggerMenu();

    act(() => {
      result.current.updateEditorTrigger('/');
    });

    expect(result.current.triggerQuery).toBe('');
    expect(result.current.triggerItems.map((item) => item.label)).toContain('Heading 2');
    expect(result.current.triggerItems.length).toBeGreaterThan(1);
  });

  it('starts searching for a page once the mention sign has been typed', () => {
    const { result } = renderTriggerMenu();

    act(() => {
      result.current.updateEditorTrigger('@bob');
    });

    expect(result.current.triggerQuery).toBe('bob');
    expect(result.current.triggerEmptyMessage).toBe('Searching pages...');
  });

  it('opens the emoji finder once the colon has been typed', () => {
    const { result } = renderTriggerMenu();

    act(() => {
      result.current.updateEditorTrigger(':heart');
    });

    expect(result.current.triggerQuery).toBe('heart');
    expect(result.current.triggerItems.some((item) => item.label.startsWith('❤️'))).toBe(true);
  });

  it('does not open any finder on a colon glued to a word, as in a url or a time', () => {
    const { result } = renderTriggerMenu();

    act(() => {
      result.current.updateEditorTrigger('http://x');
    });
    expect(result.current.triggerQuery).toBeNull();

    act(() => {
      result.current.updateEditorTrigger('12:30');
    });
    expect(result.current.triggerQuery).toBeNull();
  });

  it('does not open the emoji finder on a bare colon: punctuation opens nothing on its own', () => {
    const { result } = renderTriggerMenu();

    act(() => {
      result.current.updateEditorTrigger(':');
    });

    expect(result.current.triggerQuery).toBeNull();
  });

  it('opens the emoji finder on a name written with an accent', () => {
    const { result } = renderTriggerMenu();

    act(() => {
      result.current.updateEditorTrigger(':guiño');
    });

    expect(result.current.triggerQuery).toBe('guiño');
    expect(result.current.triggerItems.some((item) => item.label.startsWith('😉'))).toBe(true);
  });

  it('opens the emoji finder on a name carrying ñ', () => {
    const { result } = renderTriggerMenu();

    act(() => {
      result.current.updateEditorTrigger(':cumpleaños');
    });

    expect(result.current.triggerQuery).toBe('cumpleaños');
    expect(result.current.triggerItems.some((item) => item.label.startsWith('🎂'))).toBe(true);
  });
});

describe('filtering as the query changes', () => {
  it('narrows the commands down to the ones matching the text typed after the slash', () => {
    const { result } = renderTriggerMenu();

    act(() => {
      result.current.updateEditorTrigger('/head');
    });

    expect(result.current.triggerItems.map((item) => item.label)).toEqual(['Heading 1', 'Heading 2', 'Heading 3']);
  });

  it('shows the empty message once nothing matches anymore', () => {
    const { result } = renderTriggerMenu();

    act(() => {
      result.current.updateEditorTrigger('/doesnotexist');
    });

    expect(result.current.triggerItems).toEqual([]);
    expect(result.current.triggerEmptyMessage).toBe('No matching block commands.');
  });

  it('narrows the emoji down to the ones matching the name typed after the colon', () => {
    const { result } = renderTriggerMenu();

    act(() => {
      result.current.updateEditorTrigger(':dog');
    });

    expect(result.current.triggerItems.length).toBe(1);
    expect(result.current.triggerItems[0]?.label.startsWith('🐶')).toBe(true);
  });
});

describe('moving the selection with the arrow keys', () => {
  it('steps forward with ArrowDown and wraps from the last item back to the first', () => {
    const { editorView, result } = renderTriggerMenu();
    openTriggerMenu(result, '/');
    const itemCount = result.current.triggerItems.length;

    for (let step = 1; step <= itemCount; step += 1) {
      act(() => {
        result.current.answerKeyPress(editorView, keyDown('ArrowDown'));
      });
      expect(result.current.triggerSelectedIndex).toBe(step % itemCount);
    }
  });

  it('steps backward with ArrowUp and wraps from the first item back to the last', () => {
    const { editorView, result } = renderTriggerMenu();
    openTriggerMenu(result, '/');
    const itemCount = result.current.triggerItems.length;

    act(() => {
      result.current.answerKeyPress(editorView, keyDown('ArrowUp'));
    });

    expect(result.current.triggerSelectedIndex).toBe(itemCount - 1);
  });
});

describe('choosing a command with Enter', () => {
  it('runs the selected command and closes the menu', () => {
    const { editorView, result } = renderTriggerMenu();
    putCursorAt(editorView, 17);
    openTriggerMenu(result, '/head');

    act(() => {
      result.current.answerKeyPress(editorView, keyDown('Enter'));
    });

    expect(result.current.triggerQuery).toBeNull();
    expect(editorView.state.selection.$from.parent.type.name).toBe('heading');
  });

  it('writes the emoji as plain text and closes the menu', () => {
    const { editorView, result } = renderTriggerMenu();
    putCursorAt(editorView, 17);
    openTriggerMenu(result, ':dog');

    act(() => {
      result.current.answerKeyPress(editorView, keyDown('Enter'));
    });

    expect(result.current.triggerQuery).toBeNull();
    expect(editorView.state.doc.textContent).toContain('🐶');
  });
});

describe('closing the menu with Escape', () => {
  it('closes the open menu instead of falling through to the editor', () => {
    const { editorView, escapedSelections, result } = renderTriggerMenu();
    openTriggerMenu(result, '/');

    act(() => {
      result.current.answerKeyPress(editorView, keyDown('Escape'));
    });

    expect(result.current.triggerQuery).toBeNull();
    expect(result.current.triggerMenuPosition).toBeNull();
    expect(result.current.triggerSelectedIndex).toBe(0);
    expect(escapedSelections).toEqual([]);
  });

  it('lets Escape fall through to the editor once no menu is open', () => {
    const { editorView, escapedSelections, result } = renderTriggerMenu();
    selectRange(editorView, 1, 5);

    act(() => {
      result.current.answerKeyPress(editorView, keyDown('Escape'));
    });

    expect(escapedSelections).toEqual([editorView]);
  });
});

describe('the @ menu also offering people and days', () => {
  it('searches people once a space is at hand to scope them to', async () => {
    const { result } = renderTriggerMenu('space-1');

    act(() => {
      result.current.updateEditorTrigger('@ana');
    });

    await waitFor(() =>
      expect(searchPagePersonCandidatesAction).toHaveBeenCalledWith({ query: 'ana', spaceId: 'space-1' }),
    );
  });

  it('keeps "Searching pages..." as the loading message while people are also being searched', () => {
    const { result } = renderTriggerMenu('space-1');

    act(() => {
      result.current.updateEditorTrigger('@bob');
    });

    expect(result.current.triggerEmptyMessage).toBe('Searching pages...');
  });

  it('offers the four days under their own translated names once @ is typed', () => {
    const { result } = renderTriggerMenu('space-1');

    act(() => {
      result.current.updateEditorTrigger('@');
    });

    expect(result.current.triggerItems.map((item) => item.label)).toEqual(
      expect.arrayContaining(['Today', 'Tomorrow', 'Yesterday', 'Pick another day']),
    );
  });

  it('names a person chosen from the @ menu', async () => {
    const { editorView, result } = renderTriggerMenu('space-1');
    putCursorAt(editorView, 17);
    openTriggerMenu(result, '@ana');

    await waitFor(() => expect(result.current.triggerItems[0]?.id).toBe('person-9f5d6c3a-1b2e-4a3d-8f6b-2c1a9d0e7f4b'));

    act(() => {
      result.current.answerKeyPress(editorView, keyDown('Enter'));
    });

    expect(result.current.triggerQuery).toBeNull();
    let namedPersonLabel: unknown;
    editorView.state.doc.descendants((node) => {
      if (node.type.name === 'person') namedPersonLabel = node.attrs.label;
    });
    expect(namedPersonLabel).toBe('Ana');
  });
});
