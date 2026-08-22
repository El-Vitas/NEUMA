import { describe, expect, it } from 'bun:test';
import { pageContentSchema } from '@company-brain/shared';
import type { Command } from 'prosemirror-state';
import { EditorState } from 'prosemirror-state';
import type { PagePersonOption } from '@/modules/pages/collections/types/pages.schema.types';
import { createEmptyPageContent, serializePageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';
import { pageEditorSchema } from '@/modules/pages/editor/lib/pages.editor.schema';
import {
  askForAPerson,
  createPagePersonInsertCommand,
  createPagePersonNodeView,
  keepThePeopleNamed,
} from '@/modules/pages/editor/text/lib/pages.editor.person.lib';

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

describe('askForAPerson', () => {
  it('writes the trigger a person is looked up by', () => {
    const content = serializePageEditorState(runCommand(createEditorState(), askForAPerson));

    expect(content.content[0]).toMatchObject({ content: [{ text: '@', type: 'text' }] });
  });
});

describe('createPagePersonInsertCommand', () => {
  it('names a person built from a user id and a label, and round-trips it', () => {
    const run = createPagePersonInsertCommand(pageEditorSchema, {
      label: 'Ana',
      userId: '9f5d6c3a-1b2e-4a3d-8f6b-2c1a9d0e7f4b',
    });
    const content = serializePageEditorState(runCommand(createEditorState(), run));

    expect(pageContentSchema.safeParse(content).success).toBe(true);
    expect(content.content[0]).toMatchObject({
      content: [{ attrs: { label: 'Ana', userId: '9f5d6c3a-1b2e-4a3d-8f6b-2c1a9d0e7f4b' }, type: 'person' }],
    });
  });

  it('rejects an empty label without dispatching', () => {
    const run = createPagePersonInsertCommand(pageEditorSchema, {
      label: '',
      userId: '9f5d6c3a-1b2e-4a3d-8f6b-2c1a9d0e7f4b',
    });

    expect(rejectsWithoutDispatching(createEditorState(), run)).toBe(false);
  });

  it('rejects a user id that is not a uuid without dispatching', () => {
    const run = createPagePersonInsertCommand(pageEditorSchema, { label: 'Ana', userId: 'not-a-uuid' });

    expect(rejectsWithoutDispatching(createEditorState(), run)).toBe(false);
  });
});

describe('keepThePeopleNamed', () => {
  const members: readonly PagePersonOption[] = [
    { email: 'ana@example.com', id: '1', name: 'Ana Pérez' },
    { email: 'bob@example.com', id: '2', name: 'Bob Soto' },
  ];

  it('keeps the members answering to what was written, folding accents and case', () => {
    expect(keepThePeopleNamed(members, 'ana', 5)).toEqual([members[0]]);
    expect(keepThePeopleNamed(members, 'PÉREZ', 5)).toEqual([members[0]]);
  });

  it('keeps everybody when nothing has been written yet', () => {
    expect(keepThePeopleNamed(members, '', 5)).toEqual(members);
  });

  it('never answers with more than asked for', () => {
    expect(keepThePeopleNamed(members, '', 1)).toEqual([members[0]]);
  });
});

describe('createPagePersonNodeView', () => {
  const userId = '9f5d6c3a-1b2e-4a3d-8f6b-2c1a9d0e7f4b';
  const buildPersonNode = () => pageEditorSchema.nodes.person.createChecked({ label: 'Ana Pérez', userId });

  it('carries a mark of its own, told apart from a page mention', () => {
    const view = createPagePersonNodeView(buildPersonNode(), 'Person');

    expect(view.dom.querySelector('svg')).not.toBeNull();
    expect((view.dom as HTMLElement).dataset.pagePerson).toBe(userId);
  });

  it('shows at minimum the name once the pointer rests on it, with no member data at hand', () => {
    const view = createPagePersonNodeView(buildPersonNode(), 'Person');

    expect((view.dom as HTMLElement).title).toBe('Ana Pérez');
  });

  it('adds the address the person is reached at once a member answering that id is found', () => {
    const view = createPagePersonNodeView(buildPersonNode(), 'Person', {
      findMember: (id) => (id === userId ? { email: 'ana@example.com', id, name: 'Ana Pérez' } : undefined),
    });

    expect((view.dom as HTMLElement).title).toBe('Ana Pérez · ana@example.com');
  });

  it('shows only the name, never a fallback phrase, when the lookup knows nothing about this person', () => {
    const view = createPagePersonNodeView(buildPersonNode(), 'Person', {
      findMember: () => undefined,
    });

    expect((view.dom as HTMLElement).title).toBe('Ana Pérez');
  });
});
