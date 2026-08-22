import { describe, expect, it } from 'bun:test';
import { createPageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';
import {
  readPageEditorFoldedRanges,
  togglePageEditorHeadingFold,
} from '@/modules/pages/editor/text/lib/pages.editor.heading-fold.lib';
import type { PageContent } from '@/modules/pages/types/pages.types';

const heading = (level: number, text: string, collapsed?: boolean) => ({
  attrs: collapsed === undefined ? { level } : { collapsed, level },
  content: [{ text, type: 'text' as const }],
  type: 'heading' as const,
});

const paragraph = (text: string) => ({ content: [{ text, type: 'text' as const }], type: 'paragraph' as const });

const buildPage = (content: readonly unknown[]): PageContent =>
  ({ content, schemaVersion: 1, type: 'doc' }) as PageContent;

/** What the reader would still see, once what is folded is taken out. */
const readVisibleText = (content: readonly unknown[]): readonly string[] => {
  const state = createPageEditorState(buildPage(content), 'Select block');
  const hidden = readPageEditorFoldedRanges(state.doc);
  const visible: string[] = [];
  state.doc.forEach((node, offset) => {
    if (!hidden.some((range) => range.from === offset)) visible.push(node.textContent);
  });
  return visible;
};

describe('what a folded heading takes with it', () => {
  it('hides what follows until the next heading of the same rank', () => {
    const visible = readVisibleText([
      heading(2, 'A', true),
      paragraph('texto de A'),
      heading(2, 'B'),
      paragraph('texto de B'),
    ]);

    expect(visible).toEqual(['A', 'B', 'texto de B']);
  });

  it('takes a deeper heading with it, and whatever that one was holding', () => {
    const visible = readVisibleText([
      heading(2, 'A', true),
      paragraph('texto de A'),
      heading(3, 'sub de A'),
      paragraph('texto del sub'),
      heading(2, 'B'),
    ]);

    expect(visible).toEqual(['A', 'B']);
  });

  it('stops at a louder heading, which was never underneath it', () => {
    const visible = readVisibleText([heading(2, 'A', true), paragraph('texto de A'), heading(1, 'Titulo')]);

    expect(visible).toEqual(['A', 'Titulo']);
  });

  it('hides nothing while no heading is folded', () => {
    const visible = readVisibleText([heading(2, 'A'), paragraph('texto de A'), heading(3, 'sub')]);

    expect(visible).toEqual(['A', 'texto de A', 'sub']);
  });

  it('reaches the end of the page when nothing comes to close it', () => {
    const visible = readVisibleText([heading(2, 'A', true), paragraph('uno'), paragraph('dos')]);

    expect(visible).toEqual(['A']);
  });
});

describe('folding a heading', () => {
  it('writes the decision on the heading, so the page reopens as it was left', () => {
    const state = createPageEditorState(buildPage([heading(2, 'A'), paragraph('texto')]), 'Select block');

    const folded = state.apply(
      (() => {
        let transaction = state.tr;
        togglePageEditorHeadingFold(0)(state, (next) => {
          transaction = next;
        });
        return transaction;
      })(),
    );

    expect(folded.doc.firstChild?.attrs.collapsed).toBe(true);
  });

  it('refuses a position that is not a heading', () => {
    const state = createPageEditorState(buildPage([paragraph('solo texto')]), 'Select block');

    expect(togglePageEditorHeadingFold(0)(state, undefined)).toBe(false);
  });
});
