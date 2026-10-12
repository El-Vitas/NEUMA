import { describe, expect, it } from 'bun:test';
import type { PageContent, PageContentNode } from '@neuma/shared';
import { EditorView } from 'prosemirror-view';
import { createPageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';
import {
  closePageEditorFind,
  findPageEditorClosedTogglePositions,
  findPageEditorMatches,
  readPageEditorFindState,
  replaceAllPageEditorFindMatches,
  replacePageEditorFindMatch,
  revealPageEditorFindMatch,
  searchPageEditorFind,
  stepPageEditorFindMatch,
  unfoldPageEditorHeadingsHiding,
} from '@/modules/pages/editor/menus/lib/pages.editor.find.lib';

const text = (value: string): PageContentNode => ({ text: value, type: 'text' }) as PageContentNode;

const paragraph = (value: string): PageContentNode => ({ content: [text(value)], type: 'paragraph' });

const heading = (level: number, value: string, collapsed?: boolean): PageContentNode =>
  ({
    attrs: collapsed === undefined ? { level } : { collapsed, level },
    content: [text(value)],
    type: 'heading',
  }) as PageContentNode;

const toggle = (summary: string, open: boolean, children: readonly PageContentNode[]): PageContentNode =>
  ({ attrs: { open, summary }, content: children, type: 'toggle' }) as PageContentNode;

const buildPage = (content: readonly PageContentNode[]): PageContent =>
  ({ content, schemaVersion: 1, type: 'doc' }) as PageContent;

const mountEditor = (
  content: readonly PageContentNode[],
): { readonly container: HTMLElement; readonly view: EditorView } => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const state = createPageEditorState(buildPage(content), 'Select block');
  return { container, view: new EditorView(container, { state }) };
};

describe('every place on the page that answers to what is being looked for', () => {
  it('finds a match regardless of capitals and accents', () => {
    const state = createPageEditorState(buildPage([paragraph('El café estaba frío')]), 'Select block');

    expect(findPageEditorMatches(state.doc, 'CAFE')).toEqual([{ from: 4, to: 8 }]);
  });

  it('keeps a match aligned to the right text when folding a character grows it', () => {
    // '가' folds to two code units (its NFD decomposition is not stripped, since neither jamo is a diacritic),
    // one raw character producing two folded ones — exactly the case that can desynchronize a naive index map.
    const state = createPageEditorState(buildPage([paragraph('x가y')]), 'Select block');

    expect(findPageEditorMatches(state.doc, '가')).toEqual([{ from: 2, to: 3 }]);
  });

  it('finds a match that reaches across a mark change', () => {
    const withMark: PageContentNode = {
      content: [text('Hello '), { marks: [{ type: 'strong' }], text: 'World', type: 'text' } as PageContentNode],
      type: 'paragraph',
    };
    const state = createPageEditorState(buildPage([withMark]), 'Select block');

    expect(findPageEditorMatches(state.doc, 'lo Wo')).toHaveLength(1);
  });

  it('never reaches across two blocks for a single match', () => {
    const state = createPageEditorState(buildPage([paragraph('wor'), paragraph('ld')]), 'Select block');

    expect(findPageEditorMatches(state.doc, 'world')).toEqual([]);
  });

  it('does not join two spans of text a picture is standing between', () => {
    const brokenByAHardBreak: PageContentNode = {
      content: [text('wor'), { type: 'hard_break' } as PageContentNode, text('ld')],
      type: 'paragraph',
    };
    const state = createPageEditorState(buildPage([brokenByAHardBreak]), 'Select block');

    expect(findPageEditorMatches(state.doc, 'world')).toEqual([]);
    expect(findPageEditorMatches(state.doc, 'wor')).toHaveLength(1);
    expect(findPageEditorMatches(state.doc, 'ld')).toHaveLength(1);
  });

  it('counts occurrences once each, without overlapping them', () => {
    const state = createPageEditorState(buildPage([paragraph('aaaa')]), 'Select block');

    expect(findPageEditorMatches(state.doc, 'aa')).toEqual([
      { from: 1, to: 3 },
      { from: 3, to: 5 },
    ]);
  });

  it('finds nothing for an empty query', () => {
    const state = createPageEditorState(buildPage([paragraph('algo')]), 'Select block');

    expect(findPageEditorMatches(state.doc, '')).toEqual([]);
  });
});

describe('opening whatever is hiding a match', () => {
  it('unfolds the heading that is holding a match out of sight', () => {
    const state = createPageEditorState(
      buildPage([heading(2, 'A', true), paragraph('escondido'), heading(2, 'B')]),
      'Select block',
    );
    const match = findPageEditorMatches(state.doc, 'escondido')[0];
    if (match === undefined) throw new Error('expected a match');

    const transaction = unfoldPageEditorHeadingsHiding(state.tr, match.from);

    expect(transaction.doc.firstChild?.attrs.collapsed).toBe(false);
  });

  it('leaves other folded headings untouched', () => {
    const state = createPageEditorState(
      buildPage([heading(2, 'A', true), paragraph('uno'), heading(2, 'B', true), paragraph('dos')]),
      'Select block',
    );
    const match = findPageEditorMatches(state.doc, 'uno')[0];
    if (match === undefined) throw new Error('expected a match');

    const transaction = unfoldPageEditorHeadingsHiding(state.tr, match.from);

    expect(transaction.doc.firstChild?.attrs.collapsed).toBe(false);
    expect(transaction.doc.child(2)?.attrs.collapsed).toBe(true);
  });

  it('opens only the heading actually hiding a match under a later fold, leaving an earlier one closed', () => {
    const state = createPageEditorState(
      buildPage([heading(2, 'A', true), paragraph('uno'), heading(2, 'B', true), paragraph('escondido')]),
      'Select block',
    );
    const match = findPageEditorMatches(state.doc, 'escondido')[0];
    if (match === undefined) throw new Error('expected a match');

    const transaction = unfoldPageEditorHeadingsHiding(state.tr, match.from);

    expect(transaction.doc.firstChild?.attrs.collapsed).toBe(true);
    expect(transaction.doc.child(2)?.attrs.collapsed).toBe(false);
  });

  it('lists every closed toggle a position stands inside of', () => {
    const state = createPageEditorState(buildPage([toggle('T', false, [paragraph('secreto')])]), 'Select block');
    const match = findPageEditorMatches(state.doc, 'secreto')[0];
    if (match === undefined) throw new Error('expected a match');

    expect(findPageEditorClosedTogglePositions(state.doc, match.from)).toEqual([0]);
  });

  it('opens both a folded heading and a closed toggle to reveal a single match', () => {
    const state = createPageEditorState(
      buildPage([heading(2, 'A', true), toggle('T', false, [paragraph('secreto')])]),
      'Select block',
    );
    const match = findPageEditorMatches(state.doc, 'secreto')[0];
    if (match === undefined) throw new Error('expected a match');

    const transaction = revealPageEditorFindMatch(state.tr, match);

    expect(transaction.doc.firstChild?.attrs.collapsed).toBe(false);
    expect(findPageEditorClosedTogglePositions(transaction.doc, match.from)).toEqual([]);
    expect(transaction.selection.from).toBeGreaterThanOrEqual(match.from);
  });
});

describe('searching from a mounted editor', () => {
  it('finds every match and stands on the first one', () => {
    const { container, view } = mountEditor([paragraph('foo bar'), paragraph('foo baz')]);

    searchPageEditorFind(view, 'foo');

    const found = readPageEditorFindState(view);
    expect(found.matches).toHaveLength(2);
    expect(found.currentIndex).toBe(0);

    view.destroy();
    container.remove();
  });

  it('steps to the next match and wraps back to the first', () => {
    const { container, view } = mountEditor([paragraph('foo bar'), paragraph('foo baz')]);
    searchPageEditorFind(view, 'foo');

    stepPageEditorFindMatch(view, 1);
    expect(readPageEditorFindState(view).currentIndex).toBe(1);

    stepPageEditorFindMatch(view, 1);
    expect(readPageEditorFindState(view).currentIndex).toBe(0);

    view.destroy();
    container.remove();
  });

  it('steps to the previous match and wraps back to the last', () => {
    const { container, view } = mountEditor([paragraph('foo bar'), paragraph('foo baz')]);
    searchPageEditorFind(view, 'foo');

    stepPageEditorFindMatch(view, -1);
    expect(readPageEditorFindState(view).currentIndex).toBe(1);

    view.destroy();
    container.remove();
  });

  it('opens the fold hiding the match it steps onto', () => {
    const { container, view } = mountEditor([heading(2, 'A', true), paragraph('escondido')]);

    searchPageEditorFind(view, 'escondido');

    expect(view.state.doc.firstChild?.attrs.collapsed).toBe(false);

    view.destroy();
    container.remove();
  });

  it('loses its matches when the editor is given a brand new state, and finds them again by searching once more', () => {
    const { container, view } = mountEditor([paragraph('foo bar'), paragraph('foo baz')]);
    searchPageEditorFind(view, 'foo');
    expect(readPageEditorFindState(view).matches).toHaveLength(2);

    // The way a collaboration swap replaces the state wholesale: a fresh plugin, born knowing nothing.
    view.updateState(createPageEditorState(buildPage([paragraph('foo bar'), paragraph('foo baz')]), 'Select block'));
    expect(readPageEditorFindState(view).matches).toEqual([]);

    searchPageEditorFind(view, 'foo');

    expect(readPageEditorFindState(view).matches).toHaveLength(2);

    view.destroy();
    container.remove();
  });

  it('forgets the search when closed', () => {
    const { container, view } = mountEditor([paragraph('foo')]);
    searchPageEditorFind(view, 'foo');

    closePageEditorFind(view);

    const found = readPageEditorFindState(view);
    expect(found.matches).toEqual([]);
    expect(found.query).toBe('');

    view.destroy();
    container.remove();
  });

  it('leaves searching out of the undo history', () => {
    const { container, view } = mountEditor([paragraph('foo bar'), paragraph('foo baz')]);
    const before = view.state.doc.toString();

    searchPageEditorFind(view, 'foo');
    stepPageEditorFindMatch(view, 1);

    expect(view.state.doc.toString()).toBe(before);

    view.destroy();
    container.remove();
  });
});

describe('putting something else in place of what was found', () => {
  it('replaces the current match in one transaction, keeping the block it lives in', () => {
    const { container, view } = mountEditor([paragraph('foo bar'), paragraph('foo baz')]);
    searchPageEditorFind(view, 'foo');
    const found = readPageEditorFindState(view);
    const match = found.matches[0];
    if (match === undefined) throw new Error('expected a match');

    replacePageEditorFindMatch(view, match, 'FOO', 0);

    expect(view.state.doc.childCount).toBe(2);
    expect(view.state.doc.child(0)?.type.name).toBe('paragraph');
    expect(view.state.doc.textBetween(0, view.state.doc.content.size, ' ')).toContain('FOO bar');

    view.destroy();
    container.remove();
  });

  it('replaces every match at once, from the last back to the first', () => {
    const { container, view } = mountEditor([paragraph('foo bar'), paragraph('foo baz')]);
    searchPageEditorFind(view, 'foo');
    const found = readPageEditorFindState(view);

    replaceAllPageEditorFindMatches(view, found.matches, 'qux', 'foo');

    expect(view.state.doc.textBetween(0, view.state.doc.content.size, ' ')).toBe('qux bar qux baz');
    expect(readPageEditorFindState(view).matches).toEqual([]);

    view.destroy();
    container.remove();
  });

  it('does nothing when there is nothing to replace', () => {
    const { container, view } = mountEditor([paragraph('foo')]);
    const before = view.state.doc.toString();

    replaceAllPageEditorFindMatches(view, [], 'FOO', 'nada');

    expect(view.state.doc.toString()).toBe(before);

    view.destroy();
    container.remove();
  });
});
