import type { Node as EditorDocument } from 'prosemirror-model';
import { type EditorState, TextSelection } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { PAGE_EDITOR_HEADING_TYPE } from '../../text/constants/pages.editor.heading.constants';
import type { PageEditorHeading } from '../types/pages.editor.contents.types';

/**
 * The headings a page holds, in the order they are written.
 *
 * Where each one is matters as much as what it says: a page has no addresses of
 * its own, so going to a heading means going to a place in the writing, and the
 * place is what is kept here.
 */
export const readPageHeadings = (document: EditorDocument): readonly PageEditorHeading[] => {
  const headings: PageEditorHeading[] = [];
  document.descendants((node, position) => {
    if (node.type.name !== PAGE_EDITOR_HEADING_TYPE) return true;
    const level = typeof node.attrs.level === 'number' ? node.attrs.level : 1;
    headings.push({ level, position, title: node.textContent.trim() });
    return false;
  });
  return headings;
};

/**
 * What the list of headings comes to, said shortly.
 *
 * The index is redrawn when this changes and left alone when it does not, so
 * writing a paragraph under a heading does not rebuild the list under the
 * cursor of whoever is writing it.
 */
export const nameTheHeadings = (headings: readonly PageEditorHeading[]): string =>
  headings.map((heading) => `${String(heading.level)}:${heading.title}`).join('\n');

/**
 * Goes to a heading of the page.
 *
 * The writing is put at the heading rather than the page merely scrolled to it:
 * arriving somewhere in a page one can write in means arriving with the cursor,
 * so the next word typed lands where the reader was sent.
 *
 * The writing is taken hold of first: a page reached from outside it — from the
 * index kept at the side, before anybody has written a word — has its cursor
 * nowhere, and a page with the cursor nowhere has nothing to scroll towards.
 */
export const goToThePageHeading = (view: EditorView, position: number): void => {
  view.focus();
  const inside = view.state.doc.resolve(Math.min(position + 1, view.state.doc.content.size));
  view.dispatch(view.state.tr.setSelection(TextSelection.near(inside)).scrollIntoView());
};

/**
 * Follows the headings of a page and says them whenever they change.
 *
 * The index kept at the side of the page lives outside the writing, so it has to
 * be told; and it is told only when the list is no longer the one it is showing,
 * because redrawing it under somebody writing a paragraph is how a quiet index
 * turns into a flicker at the edge of the eye.
 */
export const followThePageHeadings = (
  tell: (headings: readonly PageEditorHeading[]) => void,
): ((state: EditorState) => void) => {
  let told: string | null = null;
  return (state: EditorState): void => {
    const headings = readPageHeadings(state.doc);
    const named = nameTheHeadings(headings);
    if (named === told) return;
    told = named;
    tell(headings);
  };
};
