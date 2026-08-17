import { describe, expect, it } from 'bun:test';
import type { PageContent, PageContentNode } from '@company-brain/shared';
import { EditorView } from 'prosemirror-view';
import { pageEditorFindKey } from '@/modules/pages/lib/pages.editor.find.lib';
import { createPageEditorFindPlugin } from '@/modules/pages/lib/pages.editor.find.plugin.lib';
import { createPageEditorState } from '@/modules/pages/lib/pages.editor.lib';

const paragraph = (value: string): PageContentNode =>
  ({ content: [{ text: value, type: 'text' }], type: 'paragraph' }) as PageContentNode;

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

const countMarksOf = (container: HTMLElement, token: string): number =>
  container.querySelectorAll(`[class*="${token}"]`).length;

describe('an editor state built with the plugin list', () => {
  it('already has something to say about the search, unasked', () => {
    const state = createPageEditorState(buildPage([paragraph('foo')]), 'Select block');
    expect(pageEditorFindKey.getState(state)).toEqual({ currentIndex: null, matches: [], query: '' });
  });
});

describe('highlighting every place a search answers to', () => {
  it('draws a mark for every match, and a louder one for the current match', () => {
    const { container, view } = mountEditor([paragraph('foo bar'), paragraph('foo baz'), paragraph('foo qux')]);

    view.dispatch(view.state.tr.setMeta(pageEditorFindKey, { query: 'foo', type: 'query' }));

    expect(countMarksOf(container, 'bg-yellow-200')).toBe(2);
    expect(countMarksOf(container, 'bg-orange-400')).toBe(1);

    view.destroy();
    container.remove();
  });

  it('moves which mark is louder when told to go to another match', () => {
    const { container, view } = mountEditor([paragraph('foo bar'), paragraph('foo baz')]);
    view.dispatch(view.state.tr.setMeta(pageEditorFindKey, { query: 'foo', type: 'query' }));

    view.dispatch(view.state.tr.setMeta(pageEditorFindKey, { index: 1, type: 'goto' }));

    expect(pageEditorFindKey.getState(view.state)?.currentIndex).toBe(1);
    expect(countMarksOf(container, 'bg-yellow-200')).toBe(1);
    expect(countMarksOf(container, 'bg-orange-400')).toBe(1);

    view.destroy();
    container.remove();
  });

  it('recomputes the matches when the writing changes elsewhere, without being told to', () => {
    const { container, view } = mountEditor([paragraph('foo')]);
    view.dispatch(view.state.tr.setMeta(pageEditorFindKey, { query: 'foo', type: 'query' }));
    expect(pageEditorFindKey.getState(view.state)?.matches).toHaveLength(1);

    view.dispatch(view.state.tr.insertText(' foo', view.state.doc.content.size - 1));

    expect(pageEditorFindKey.getState(view.state)?.matches).toHaveLength(2);

    view.destroy();
    container.remove();
  });

  it('forgets everything the moment it is cleared', () => {
    const { container, view } = mountEditor([paragraph('foo')]);
    view.dispatch(view.state.tr.setMeta(pageEditorFindKey, { query: 'foo', type: 'query' }));

    view.dispatch(view.state.tr.setMeta(pageEditorFindKey, { type: 'clear' }));

    expect(pageEditorFindKey.getState(view.state)).toEqual({ currentIndex: null, matches: [], query: '' });
    expect(countMarksOf(container, 'bg-yellow-200')).toBe(0);
    expect(countMarksOf(container, 'bg-orange-400')).toBe(0);

    view.destroy();
    container.remove();
  });

  it('draws nothing at all when it was never asked to look for anything', () => {
    const { container, view } = mountEditor([paragraph('foo bar')]);

    expect(countMarksOf(container, 'bg-yellow-200')).toBe(0);
    expect(countMarksOf(container, 'bg-orange-400')).toBe(0);

    view.destroy();
    container.remove();
  });
});

describe('building the plugin itself', () => {
  it('is keyed so the editor holds exactly one of it', () => {
    const plugin = createPageEditorFindPlugin();
    expect(plugin.spec.key).toBe(pageEditorFindKey);
  });
});
