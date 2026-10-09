import { describe, expect, it } from 'bun:test';
import { readDocsFrontMatter, readDocsMarkdown } from '@/modules/docs/lib/docs.front-matter.lib';

const file = ['---', 'title: Diagramas', 'summary: Cómo escribir uno', 'order: 2', '---', '', 'Lo primero.'].join('\n');

describe('what a document says about itself', () => {
  it('reads what it is called, what it answers and where it goes', () => {
    expect(readDocsFrontMatter(file)).toEqual({ order: 2, summary: 'Cómo escribir uno', title: 'Diagramas' });
  });

  it('holds up when nothing is said about it', () => {
    expect(readDocsFrontMatter('Sin nada arriba.')).toEqual({ order: 999, summary: '', title: '' });
  });

  it('hands back everything it says, without what it says about itself', () => {
    expect(readDocsMarkdown(file)).toBe('Lo primero.');
  });
});
