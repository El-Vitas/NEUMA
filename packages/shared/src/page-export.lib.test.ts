import { describe, expect, it } from 'bun:test';
import { writePagesAsMarkdownFile } from './page-export.lib.js';
import type { PageContent } from './schemas/page-content.schema.js';

const saying = (words: string): PageContent =>
  ({
    content: [{ content: [{ text: words, type: 'text' }], type: 'paragraph' }],
    schemaVersion: 1,
    type: 'doc',
  }) as unknown as PageContent;

describe('writePagesAsMarkdownFile', () => {
  it('writes a lone page with its name as the first heading', () => {
    const written = writePagesAsMarkdownFile([{ content: saying('Lo que dice'), path: [], title: 'Manual' }]);

    expect(written).toContain('# Manual');
    expect(written).toContain('Lo que dice');
  });

  it('says where each page lived, so what comes out can be put back where it was', () => {
    const written = writePagesAsMarkdownFile([
      { content: saying('arriba'), path: [], title: 'Madre' },
      { content: saying('abajo'), path: ['Madre'], title: 'Hija' },
    ]);

    expect(written).toContain('<!-- page: Madre -->');
    expect(written).toContain('<!-- page: Madre / Hija -->');
  });

  it('keeps the pages in the order they were handed over', () => {
    const written = writePagesAsMarkdownFile([
      { content: saying('uno'), path: [], title: 'Primera' },
      { content: saying('dos'), path: [], title: 'Segunda' },
    ]);

    expect(written.indexOf('Primera')).toBeLessThan(written.indexOf('Segunda'));
  });

  it('calls a page with no name by the name it is read as everywhere else', () => {
    const written = writePagesAsMarkdownFile([{ content: saying('algo'), path: [], title: '' }], 'Sin título');

    expect(written).toContain('# Sin título');
  });

  it('writes nothing at all when there is nothing to write', () => {
    expect(writePagesAsMarkdownFile([])).toBe('');
  });
});
