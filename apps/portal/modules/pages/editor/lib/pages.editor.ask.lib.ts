import type { Command } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

/**
 * Types text at the cursor. Also opens the `@` and `:` finders from the menu by typing their trigger,
 * so there is a single path to open them.
 */
export const createPageEditorWriteCommand =
  (written: string): Command =>
  (state, dispatch) => {
    dispatch?.(state.tr.insertText(written));
    return true;
  };

const findWhoeverAnswers = (selector: string, view: EditorView | undefined): HTMLElement | null => {
  const answering = view?.dom.ownerDocument.querySelector<HTMLElement>(selector);
  if (answering === null || answering === undefined) return null;
  return 'disabled' in answering && answering.disabled === true ? null : answering;
};

/**
 * Delegates an action the editor cannot do itself (create a page, pick a file) to the element matching `selector`.
 * Without `dispatch` it only reports whether that element exists, so the menu can check before consuming typed text.
 */
export const createPageEditorAskCommand =
  (selector: string, leaveWord: (answering: HTMLElement) => void = () => {}): Command =>
  (_state, dispatch, view) => {
    const answering = findWhoeverAnswers(selector, view);
    if (answering === null) return false;
    if (dispatch === undefined) return true;
    leaveWord(answering);
    answering.click();
    return true;
  };
