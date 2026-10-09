import { pagePersonAttrsSchema } from '@company-brain/shared';
import type { Node as EditorNode, Schema } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import type { NodeView } from 'prosemirror-view';
import type { PagePersonOption } from '../../../collections/types/pages.schema.types';
import { foldPageLookingText } from '../../../links/lib/pages.looking.lib';
import {
  PAGE_EDITOR_MENTION_MARK_STYLE_CLASS,
  PAGE_EDITOR_MENTION_STYLE_CLASS,
  PAGE_EDITOR_MENTION_TRIGGER,
} from '../../blocks/constants/pages.editor.blocks.constants';
import { createPageEditorWriteCommand } from '../../lib/pages.editor.ask.lib';
import { insertPageNode } from '../../lib/pages.editor.insert.lib';
import { PAGE_PERSON_HOVER_SEPARATOR, PAGE_PERSON_MARK_STROKES } from '../constants/pages.editor.person.constants';
import type { PagePersonHoverInfo, PagePersonInsert } from '../types/pages.editor.person.types';
import { createPageMark } from './pages.editor.marks.lib';

/** Types `@`, so the picker that finds pages finds people too. */
export const askForAPerson: Command = createPageEditorWriteCommand(PAGE_EDITOR_MENTION_TRIGGER);

/** Reports `false` when the person fails `pagePersonAttrsSchema`, the same contract validated on save. */
export const createPagePersonInsertCommand = (schema: Schema, person: PagePersonInsert): Command => {
  const attrs = pagePersonAttrsSchema.safeParse(person);
  if (!attrs.success) return () => false;
  return insertPageNode(schema.nodes.person.createChecked(attrs.data));
};

const answersToThePersonName = (name: string, written: string): boolean => {
  const looked = foldPageLookingText(written.trim());
  return looked.length === 0 || foldPageLookingText(name).includes(looked);
};

export const keepThePeopleNamed = (
  candidates: readonly PagePersonOption[],
  written: string,
  howMany: number,
): readonly PagePersonOption[] =>
  candidates.filter((candidate) => answersToThePersonName(candidate.name, written)).slice(0, howMany);

/** The email is added only when the member is loaded; a missing member may just mean the list is not loaded yet. */
const describePersonOnHover = (name: string, userId: string, hover: PagePersonHoverInfo | undefined): string => {
  const member = hover?.findMember(userId);
  return member === undefined ? name : `${name}${PAGE_PERSON_HOVER_SEPARATOR}${member.email}`;
};

export const createPagePersonNodeView = (node: EditorNode, label: string, hover?: PagePersonHoverInfo): NodeView => {
  const host = document.createElement('span');
  const name = document.createElement('span');
  const mark = createPageMark(PAGE_PERSON_MARK_STROKES);

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
