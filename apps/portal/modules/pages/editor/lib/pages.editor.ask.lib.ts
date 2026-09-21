import type { Command } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

/**
 * Writes a bit of text where the cursor stands, and nada más.
 *
 * Es el gesto de teclear: sirve para poner el emoji que se eligió y también
 * para escribir el `@` o los `:` que abren el buscador que ya los contesta, en
 * vez de tener un segundo camino para abrirlo desde el menú. Siempre se puede
 * escribir, así que siempre dice que sí —el contrato de ProseMirror pide
 * contestar sin actuar cuando no llega `dispatch`.
 */
export const createPageEditorWriteCommand =
  (written: string): Command =>
  (state, dispatch) => {
    dispatch?.(state.tr.insertText(written));
    return true;
  };

/** Whoever answers, when there is anybody there and they are in a state to act. */
const findWhoeverAnswers = (selector: string, view: EditorView | undefined): HTMLElement | null => {
  const answering = view?.dom.ownerDocument.querySelector<HTMLElement>(selector);
  if (answering === null || answering === undefined) return null;
  return 'disabled' in answering && answering.disabled === true ? null : answering;
};

/**
 * Knocks on a door the page left open.
 *
 * Some of what a menu offers cannot be done by the writing — making a page,
 * choosing a file, asking where a link goes — so the writing knocks and
 * whoever holds the page answers. Asked without being told to act, it only
 * says whether anybody is there: the menu wants to know that before it takes
 * away what was typed, so that a knock nobody answers costs nothing.
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
