import { describe, expect, it } from 'bun:test';
import type { PageContent } from '@company-brain/shared';
import { PAGE_EDITOR_HEADING_ATTRIBUTE } from '@/modules/pages/constants/pages.editor.contents.constants';
import { followThePageHeadings, readPageHeadings } from '@/modules/pages/lib/pages.editor.contents.lib';
import { createPageEditorState } from '@/modules/pages/lib/pages.editor.lib';
import {
  readPageOutlineRailMarkWidthStyleClass,
  readTheWrittenHeadings,
  readWhichHeading,
} from '@/modules/pages/lib/pages.outline.lib';
import type { PageEditorHeading } from '@/modules/pages/types/pages.editor.contents.types';

const pageWithHeadings = (...titles: readonly string[]): PageContent => ({
  content: titles.map((title, level) => ({
    attrs: { level: level + 1 },
    content: [{ text: title, type: 'text' }],
    type: 'heading',
  })),
  schemaVersion: 1,
  type: 'doc',
});

const stateOf = (content: PageContent) =>
  createPageEditorState(content, 'Select', 'Insert', 'Comments', 'Write here', 'Fold');

describe('readPageHeadings', () => {
  it('reads every heading of the page with its level, in the order they are written', () => {
    const headings = readPageHeadings(stateOf(pageWithHeadings('Primero', 'Segundo')).doc);

    expect(headings.map((heading) => [heading.level, heading.title])).toEqual([
      [1, 'Primero'],
      [2, 'Segundo'],
    ]);
  });
});

describe('followThePageHeadings', () => {
  it('says the headings once, and again only when the list is no longer the same', () => {
    const said: (readonly PageEditorHeading[])[] = [];
    const follow = followThePageHeadings((headings) => said.push(headings));

    follow(stateOf(pageWithHeadings('Primero')));
    follow(stateOf(pageWithHeadings('Primero')));
    follow(stateOf(pageWithHeadings('Primero', 'Segundo')));

    expect(said.map((headings) => headings.map((heading) => heading.title))).toEqual([
      ['Primero'],
      ['Primero', 'Segundo'],
    ]);
  });
});

describe('readTheWrittenHeadings', () => {
  it('finds each listed heading where the page marked it, and ignores what was not marked', () => {
    document.body.innerHTML = `
      <h1 ${PAGE_EDITOR_HEADING_ATTRIBUTE}="0">Primero</h1>
      <h2>Sin marca</h2>
      <h2 ${PAGE_EDITOR_HEADING_ATTRIBUTE}="1">Segundo</h2>
    `;
    const headings: readonly PageEditorHeading[] = [
      { level: 1, position: 0, title: 'Primero' },
      { level: 2, position: 10, title: 'Segundo' },
    ];

    const written = readTheWrittenHeadings(headings);

    expect(written.map((heading) => heading.textContent)).toEqual(['Primero', 'Segundo']);
    expect(written.map((heading) => readWhichHeading(heading))).toEqual([0, 1]);
  });

  it('says none for a heading the page never marked', () => {
    document.body.innerHTML = '<h1>Sin marca</h1>';

    expect(readWhichHeading(document.querySelector('h1'))).toBeNull();
    expect(readWhichHeading(null)).toBeNull();
  });
});

describe('readPageOutlineRailMarkWidthStyleClass', () => {
  it('draws a longer mark for a shallower heading', () => {
    expect(readPageOutlineRailMarkWidthStyleClass(1)).toBe('w-4');
    expect(readPageOutlineRailMarkWidthStyleClass(2)).toBe('w-3');
    expect(readPageOutlineRailMarkWidthStyleClass(3)).toBe('w-2');
  });

  it('falls back to the shortest mark for a level the rail never expected', () => {
    expect(readPageOutlineRailMarkWidthStyleClass(4)).toBe('w-2');
  });
});
