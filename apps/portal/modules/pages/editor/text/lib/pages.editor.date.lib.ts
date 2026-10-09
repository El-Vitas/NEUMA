import { isPageCalendarDay, pageDateAttrsSchema } from '@neuma/shared';
import type { Node as EditorNode, Schema } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import { NodeSelection } from 'prosemirror-state';
import type { EditorView, NodeView } from 'prosemirror-view';
import type { PageEditorDateLabels } from '../../blocks/types/pages.editor.node-views.types';
import { canInsertPageNode, insertPageNode } from '../../lib/pages.editor.insert.lib';
import {
  PAGE_EDITOR_DATE_FIELD_STYLE_CLASS,
  PAGE_EDITOR_DATE_FORMAT_OPTIONS,
  PAGE_EDITOR_DATE_STYLE_CLASS,
} from '../constants/pages.editor.date.constants';
import type { PageDateInsert, PageEditorDayOffer } from '../types/pages.editor.date.types';

/** Like `insertPageNode` but leaves the node selected, so a day offered for picking opens its calendar at once. */
const insertPageNodeAndSelectIt =
  (node: EditorNode): Command =>
  (state, dispatch) => {
    if (!canInsertPageNode(state, node.type)) return false;
    if (dispatch === undefined) return true;
    const { selection, tr } = state;
    const isNodeSelected = 'node' in selection;
    const insertedAt = isNodeSelected ? selection.to : selection.from;
    if (isNodeSelected) tr.insert(insertedAt, node);
    else tr.replaceSelectionWith(node);
    dispatch(tr.setSelection(NodeSelection.create(tr.doc, insertedAt)));
    return true;
  };

const createValidatedDateNode = (schema: Schema, date: PageDateInsert): EditorNode | null => {
  const attrs = pageDateAttrsSchema.safeParse(date);
  return attrs.success ? schema.nodes.date.createChecked(attrs.data) : null;
};

/** Reports `false` when the date fails `pageDateAttrsSchema`, the same contract validated on save. */
export const createPageDateInsertCommand = (schema: Schema, date: PageDateInsert): Command => {
  const node = createValidatedDateNode(schema, date);
  return node === null ? () => false : insertPageNode(node);
};

/** Like `createPageDateInsertCommand` but leaves the new day selected. */
export const createPageDatePickCommand = (schema: Schema, date: PageDateInsert): Command => {
  const node = createValidatedDateNode(schema, date);
  return node === null ? () => false : insertPageNodeAndSelectIt(node);
};

export const readTheDayNamed = (at: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, PAGE_EDITOR_DATE_FORMAT_OPTIONS).format(new Date(`${at}T00:00:00Z`));

const asCalendarDayString = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const shiftedByDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/** Days are shifted by local year/month/day fields, not by adding a UTC day, which can cross midnight. */
export const listTheDaysOffered = (today: Date): readonly PageEditorDayOffer[] => {
  const todayAt = asCalendarDayString(today);
  return [
    { at: todayAt, id: 'today', labelKey: 'today' },
    { at: asCalendarDayString(shiftedByDays(today, 1)), id: 'tomorrow', labelKey: 'tomorrow' },
    { at: asCalendarDayString(shiftedByDays(today, -1)), id: 'yesterday', labelKey: 'yesterday' },
    { at: todayAt, id: 'pick', labelKey: 'pick' },
  ];
};

const writeTheDayChosen = (view: EditorView, getPosition: () => number | undefined, at: string): void => {
  if (!isPageCalendarDay(at)) return;
  const position = getPosition();
  if (position === undefined) return;
  view.dispatch(view.state.tr.setNodeAttribute(position, 'at', at));
};

/** `showPicker` throws outside a user gesture; the focus it leaves behind still lets the keyboard open the calendar. */
const openTheCalendar = (field: HTMLInputElement): void => {
  field.focus();
  try {
    field.showPicker?.();
  } catch {
    return;
  }
};

/** A transparent `<input type="date">` sits over the text; `isPageCalendarDay` rejects what the contract refuses. */
export const createPageDateNodeView = (
  node: EditorNode,
  view: EditorView,
  getPosition: () => number | undefined,
  labels: PageEditorDateLabels,
): NodeView => {
  const host = document.createElement('span');
  const text = document.createElement('span');
  const field = document.createElement('input');

  host.className = PAGE_EDITOR_DATE_STYLE_CLASS;
  host.contentEditable = 'false';
  text.setAttribute('aria-hidden', 'true');
  field.type = 'date';
  field.className = PAGE_EDITOR_DATE_FIELD_STYLE_CLASS;
  field.setAttribute('aria-label', labels.field);
  field.dataset.dateField = 'true';
  host.append(text, field);

  const showState = (current: EditorNode): void => {
    const named = readTheDayNamed(current.attrs.at, labels.locale);
    text.textContent = named;
    host.dataset.pageDate = current.attrs.at;
    host.setAttribute('aria-label', `${labels.label}: ${named}`);
    field.value = current.attrs.at;
  };

  showState(node);
  field.addEventListener('change', () => writeTheDayChosen(view, getPosition, field.value));

  return {
    dom: host,
    selectNode: () => openTheCalendar(field),
    stopEvent: (event) => event.target instanceof Node && host.contains(event.target),
    update: (updatedNode) => {
      if (updatedNode.type !== node.type) return false;
      showState(updatedNode);
      return true;
    },
  };
};
