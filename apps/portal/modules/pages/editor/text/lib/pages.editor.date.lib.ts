import { isPageCalendarDay, pageDateAttrsSchema } from '@company-brain/shared';
import type { Node as EditorNode, Schema } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import { NodeSelection } from 'prosemirror-state';
import type { EditorView, NodeView } from 'prosemirror-view';
import type { PageEditorDateLabels } from '../../blocks/types/pages.editor.node-views.types';
import { canInsertPageNode, insertPageNode } from '../../lib/pages.editor.insert.lib';
import {
  PAGE_EDITOR_DATE_FIELD_STYLE_CLASS,
  PAGE_EDITOR_DATE_STYLE_CLASS,
} from '../constants/pages.editor.date.constants';
import type { PageDateInsert, PageEditorDayOffer } from '../types/pages.editor.date.types';

const pageDateFormatOptions: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
  year: 'numeric',
};

/**
 * The same insert `insertPageNode` does, but leaves the new node selected —
 * for a day offered for picking, which opens its own calendar the moment it
 * lands rather than waiting to be found and clicked.
 */
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

/**
 * Builds a ProseMirror command that names a calendar day where the writing is.
 *
 * Returns a no-op command (reports `false`, never dispatches) when `at` fails
 * the shared `pageDateAttrsSchema` — the same contract
 * `serializePageEditorDocument` validates against at save time.
 */
export const createPageDateInsertCommand = (schema: Schema, date: PageDateInsert): Command => {
  const node = createValidatedDateNode(schema, date);
  return node === null ? () => false : insertPageNode(node);
};

/**
 * The same naming as `createPageDateInsertCommand`, but leaves the new day
 * selected — so a day offered for picking opens its own calendar the moment
 * it lands, instead of waiting to be found and clicked.
 */
export const createPageDatePickCommand = (schema: Schema, date: PageDateInsert): Command => {
  const node = createValidatedDateNode(schema, date);
  return node === null ? () => false : insertPageNodeAndSelectIt(node);
};

/** The calendar day, written the way a locale writes it. */
export const readTheDayNamed = (at: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, pageDateFormatOptions).format(new Date(`${at}T00:00:00Z`));

const asCalendarDayString = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const shiftedByDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/**
 * The four days offered when naming one: today, tomorrow, yesterday, and
 * today again for whoever means to pick another.
 *
 * Each is a calendar day in the reader's own day boundaries — computed by
 * shifting local year/month/day fields, never by adding a day in UTC, which
 * can land on the wrong side of midnight for a reader elsewhere.
 */
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

/**
 * Opens the field's own calendar without waiting for a click on it.
 *
 * `showPicker` asks for a browser permission granted only within a user
 * gesture; a reader who reaches this node by some other means still keeps
 * the focus it leaves behind, which is itself enough to open the calendar
 * from the keyboard.
 */
const openTheCalendar = (field: HTMLInputElement): void => {
  field.focus();
  try {
    field.showPicker?.();
  } catch {
    return;
  }
};

/**
 * A calendar day named in the writing, read the way the reader's language
 * reads a day, and rewritten through the browser's own calendar.
 *
 * The calendar is a real `<input type="date">` laid over the written day, so
 * a click on what is read is a click on the field itself: nothing here draws
 * a calendar or decides what a valid day looks like. `isPageCalendarDay`
 * still refuses whatever the field lets through that the contract would not.
 */
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
