import { pagePersonAttrsSchema } from '@company-brain/shared';
import type { Node as EditorNode, Schema } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import type { NodeView } from 'prosemirror-view';
import { foldPageLookingText } from '../../../lib/pages.looking.lib';
import type { PagePersonOption } from '../../../types/pages.schema.types';
import {
  PAGE_EDITOR_MENTION_MARK_STYLE_CLASS,
  PAGE_EDITOR_MENTION_STYLE_CLASS,
  PAGE_EDITOR_MENTION_TRIGGER,
} from '../../blocks/constants/pages.editor.blocks.constants';
import { insertPageNode } from '../../lib/pages.editor.insert.lib';
import { PAGE_PERSON_HOVER_SEPARATOR } from '../constants/pages.editor.person.constants';
import type { PagePersonHoverInfo, PagePersonInsert } from '../types/pages.editor.person.types';
import { createPageMark } from './pages.editor.marks.lib';

/**
 * Asks who is being named here.
 *
 * A person is looked up the same way a page already written is: by writing
 * `@`, so the one picker that answers for a page answers for a person too.
 */
export const askForAPerson: Command = (state, dispatch) => {
  if (dispatch === undefined) return true;
  dispatch(state.tr.insertText(PAGE_EDITOR_MENTION_TRIGGER));
  return true;
};

/**
 * Builds a ProseMirror command that names a person where the writing is.
 *
 * Returns a no-op command (reports `false`, never dispatches) when the
 * `label`/`userId` pair fails the shared `pagePersonAttrsSchema` — the same
 * contract `serializePageEditorDocument` validates against at save time.
 */
export const createPagePersonInsertCommand = (schema: Schema, person: PagePersonInsert): Command => {
  const attrs = pagePersonAttrsSchema.safeParse(person);
  if (!attrs.success) return () => false;
  return insertPageNode(schema.nodes.person.createChecked(attrs.data));
};

/** Read as somebody types a name: capitals and accents are not part of the asking. */
const answersToThePersonName = (name: string, written: string): boolean => {
  const looked = foldPageLookingText(written.trim());
  return looked.length === 0 || foldPageLookingText(name).includes(looked);
};

/** The members of the space that answer to the name, at most as many as were asked for. */
export const keepThePeopleNamed = (
  candidates: readonly PagePersonOption[],
  written: string,
  howMany: number,
): readonly PagePersonOption[] =>
  candidates.filter((candidate) => answersToThePersonName(candidate.name, written)).slice(0, howMany);

/**
 * What the pointer finds once it rests on a named person.
 *
 * The name is always there, since it is written in the node itself; the
 * address joins it only once the lookup actually holds that person. Not
 * holding them proves nothing — the list may simply not have loaded here —
 * so the name is all that is ever said beyond that.
 */
const describePersonOnHover = (name: string, userId: string, hover: PagePersonHoverInfo | undefined): string => {
  const member = hover?.findMember(userId);
  return member === undefined ? name : `${name}${PAGE_PERSON_HOVER_SEPARATOR}${member.email}`;
};

/** Strokes for a small person glyph, drawn the same way every other mark on a line is drawn. */
const pagePersonMarkStrokes: readonly string[] = [
  'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  'M4 20c1.4-4.2 4.8-6.5 8-6.5s6.6 2.3 8 6.5',
];

/**
 * A person named in the middle of a sentence.
 *
 * Drawn the same shape as a page named in the middle of a sentence — a mark in
 * front of a name, reading as part of the line — and told apart from one only
 * by which mark it carries.
 */
export const createPagePersonNodeView = (node: EditorNode, label: string, hover?: PagePersonHoverInfo): NodeView => {
  const host = document.createElement('span');
  const name = document.createElement('span');
  const mark = createPageMark(pagePersonMarkStrokes);

  mark.setAttribute('class', PAGE_EDITOR_MENTION_MARK_STYLE_CLASS);
  host.className = PAGE_EDITOR_MENTION_STYLE_CLASS;
  host.contentEditable = 'false';
  host.dataset.pagePerson = node.attrs.userId;
  host.setAttribute('aria-label', `${label}: ${node.attrs.label}`);
  host.title = describePersonOnHover(node.attrs.label, node.attrs.userId, hover);
  name.textContent = node.attrs.label;
  host.append(mark, name);
  return { dom: host };
};
