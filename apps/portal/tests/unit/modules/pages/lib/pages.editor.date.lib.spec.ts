import { describe, expect, it } from 'bun:test';
import type { PageContent } from '@company-brain/shared';
import { pageContentSchema } from '@company-brain/shared';
import type { Command } from 'prosemirror-state';
import { EditorState, NodeSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import {
  createPageDateInsertCommand,
  createPageDateNodeView,
  createPageDatePickCommand,
  listTheDaysOffered,
  readTheDayNamed,
} from '@/modules/pages/lib/pages.editor.date.lib';
import {
  createEmptyPageContent,
  createPageEditorState,
  serializePageEditorState,
} from '@/modules/pages/lib/pages.editor.lib';
import { pageEditorSchema } from '@/modules/pages/lib/pages.editor.schema';
import type { PageEditorDateLabels } from '@/modules/pages/types/pages.editor.node-views.types';

const createEditorState = (): EditorState =>
  EditorState.create({
    doc: pageEditorSchema.nodeFromJSON(pageContentSchema.parse(createEmptyPageContent())),
    schema: pageEditorSchema,
  });

const runCommand = (state: EditorState, run: Command): EditorState => {
  let nextState = state;
  const dispatched = run(state, (transaction) => {
    nextState = state.apply(transaction);
  });
  expect(dispatched).toBe(true);
  return nextState;
};

const rejectsWithoutDispatching = (state: EditorState, run: Command): boolean =>
  run(state, () => {
    throw new Error('command must not dispatch when rejecting');
  });

describe('createPageDateInsertCommand', () => {
  it('names a calendar day and round-trips it', () => {
    const run = createPageDateInsertCommand(pageEditorSchema, { at: '2026-08-15' });
    const content = serializePageEditorState(runCommand(createEditorState(), run));

    expect(pageContentSchema.safeParse(content).success).toBe(true);
    expect(content.content[0]).toMatchObject({ content: [{ attrs: { at: '2026-08-15' }, type: 'date' }] });
  });

  it('rejects a day that is not a real calendar day without dispatching', () => {
    const run = createPageDateInsertCommand(pageEditorSchema, { at: '2026-02-30' });

    expect(rejectsWithoutDispatching(createEditorState(), run)).toBe(false);
  });

  it('rejects a string shaped like nothing a calendar day without dispatching', () => {
    const run = createPageDateInsertCommand(pageEditorSchema, { at: 'not-a-day' });

    expect(rejectsWithoutDispatching(createEditorState(), run)).toBe(false);
  });
});

describe('readTheDayNamed', () => {
  it('writes the day the way English writes it', () => {
    expect(readTheDayNamed('2026-08-15', 'en')).toBe('August 15, 2026');
  });

  it('writes the day the way Spanish writes it', () => {
    expect(readTheDayNamed('2026-08-15', 'es')).toBe('15 de agosto de 2026');
  });
});

describe('createPageDateInsertCommand leaving the selection', () => {
  it('leaves an ordinary cursor after naming a day, so nothing opens on its own', () => {
    const run = createPageDateInsertCommand(pageEditorSchema, { at: '2026-08-15' });

    const next = runCommand(createEditorState(), run);

    expect(next.selection).not.toBeInstanceOf(NodeSelection);
  });
});

describe('createPageDatePickCommand', () => {
  it('names the day and leaves it selected, ready to be opened without another click', () => {
    const run = createPageDatePickCommand(pageEditorSchema, { at: '2026-08-15' });

    const next = runCommand(createEditorState(), run);
    const { selection } = next;
    if (!(selection instanceof NodeSelection)) throw new Error('picking a day must leave it selected');

    expect(selection.node.attrs.at).toBe('2026-08-15');
  });

  it('rejects a day that is not a real calendar day without dispatching', () => {
    const run = createPageDatePickCommand(pageEditorSchema, { at: '2026-02-30' });

    expect(rejectsWithoutDispatching(createEditorState(), run)).toBe(false);
  });
});

describe('listTheDaysOffered', () => {
  it('offers today, tomorrow, yesterday, and today again to pick another', () => {
    const offers = listTheDaysOffered(new Date(2026, 7, 15));

    expect(offers).toEqual([
      { at: '2026-08-15', id: 'today', labelKey: 'today' },
      { at: '2026-08-16', id: 'tomorrow', labelKey: 'tomorrow' },
      { at: '2026-08-14', id: 'yesterday', labelKey: 'yesterday' },
      { at: '2026-08-15', id: 'pick', labelKey: 'pick' },
    ]);
  });

  it('carries tomorrow into the next month and year at a month boundary', () => {
    const offers = listTheDaysOffered(new Date(2025, 11, 31));

    expect(offers[1]).toEqual({ at: '2026-01-01', id: 'tomorrow', labelKey: 'tomorrow' });
    expect(offers[2]).toEqual({ at: '2025-12-30', id: 'yesterday', labelKey: 'yesterday' });
  });

  it('carries tomorrow across a leap day into March', () => {
    const offers = listTheDaysOffered(new Date(2028, 1, 29));

    expect(offers[1]).toEqual({ at: '2028-03-01', id: 'tomorrow', labelKey: 'tomorrow' });
  });

  it('carries yesterday back across a leap day from March', () => {
    const offers = listTheDaysOffered(new Date(2028, 2, 1));

    expect(offers[2]).toEqual({ at: '2028-02-29', id: 'yesterday', labelKey: 'yesterday' });
  });
});

describe('the calendar a date node view opens', () => {
  const dateLabels: PageEditorDateLabels = { field: 'Which day', label: 'Date', locale: 'en' };

  const mountDate = (at: string): { readonly container: HTMLElement; readonly view: EditorView } => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const content: PageContent = {
      content: [{ content: [{ attrs: { at }, type: 'date' }], type: 'paragraph' }],
      schemaVersion: 1,
      type: 'doc',
    };
    const view = new EditorView(container, {
      nodeViews: {
        date: (node, editorView, getPosition) => createPageDateNodeView(node, editorView, getPosition, dateLabels),
      },
      state: createPageEditorState(content, 'Select block'),
    });
    return { container, view };
  };

  const findField = (container: HTMLElement): HTMLInputElement => {
    const field = container.querySelector<HTMLInputElement>('[data-date-field]');
    if (field === null) throw new Error('the date has no field to pick another day in');
    return field;
  };

  const readDateAttrs = (view: EditorView): Record<string, unknown> => view.state.doc.child(0).child(0).attrs;

  const choose = (field: HTMLInputElement, value: string): void => {
    field.value = value;
    field.dispatchEvent(new Event('change', { bubbles: true }));
  };

  it('offers the field as a real field of its own, named for whoever cannot see it', () => {
    const { container, view } = mountDate('2026-08-15');

    const field = findField(container);
    expect(field.tagName).toBe('INPUT');
    expect(field.type).toBe('date');
    expect(field.value).toBe('2026-08-15');
    expect(field.getAttribute('aria-label')).toBe('Which day');

    view.destroy();
    container.remove();
  });

  it('rewrites the day through a single transaction when another is chosen', () => {
    const { container, view } = mountDate('2026-08-15');

    choose(findField(container), '2026-08-20');

    expect(readDateAttrs(view).at).toBe('2026-08-20');

    view.destroy();
    container.remove();
  });

  it('refuses a day the contract would refuse rather than writing it', () => {
    const { container, view } = mountDate('2026-08-15');

    choose(findField(container), '2026-02-30');

    expect(readDateAttrs(view).at).toBe('2026-08-15');

    view.destroy();
    container.remove();
  });

  it('gives the field the focus once the day is selected, so its calendar opens without another click', () => {
    const { container, view } = mountDate('2026-08-15');
    const insideTheOnlyParagraph = 1;

    view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, insideTheOnlyParagraph)));

    expect(document.activeElement).toBe(findField(container));

    view.destroy();
    container.remove();
  });
});
