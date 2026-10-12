import type { Node as EditorDocument } from 'prosemirror-model';
import { type EditorState, TextSelection } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { PAGE_EDITOR_HEADING_TYPE } from '../../text/constants/pages.editor.heading.constants';
import type { PageEditorHeading } from '../types/pages.editor.contents.types';

/** Headings in document order; `position` is what `goToThePageHeading` navigates by. */
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

/** Signature of the heading list: the index redraws only when it changes, not on every edit. */
export const nameTheHeadings = (headings: readonly PageEditorHeading[]): string =>
  headings.map((heading) => `${String(heading.level)}:${heading.title}`).join('\n');

/** Moves the cursor to the heading, so typing continues there. Focuses first: scrolling needs a selection. */
export const goToThePageHeading = (view: EditorView, position: number): void => {
  view.focus();
  const inside = view.state.doc.resolve(Math.min(position + 1, view.state.doc.content.size));
  view.dispatch(view.state.tr.setSelection(TextSelection.near(inside)).scrollIntoView());
};

/** Notifies the side index, which lives outside the editor, only when the heading list actually changed. */
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
