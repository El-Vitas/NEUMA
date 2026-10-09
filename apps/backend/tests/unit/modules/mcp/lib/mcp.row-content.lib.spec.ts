import { describe, expect, it } from 'bun:test';
import { PAGE_CONTENT_SCHEMA_VERSION, pageContentSchema } from '@neuma/shared';
import { buildMcpRowContent } from '@/modules/mcp/lib/mcp.row-content.lib';

describe('buildMcpRowContent', () => {
  it('gives a row without text one empty paragraph, as a row made in the portal', () => {
    expect(buildMcpRowContent(undefined)).toEqual({
      content: [{ content: [], type: 'paragraph' }],
      schemaVersion: PAGE_CONTENT_SCHEMA_VERSION,
      type: 'doc',
    });
  });

  it('makes a paragraph of each part between blank lines, keeping single line breaks', () => {
    const content = buildMcpRowContent('Primera línea\nsegunda línea\n\n  \nOtro párrafo');

    expect(content.content).toEqual([
      {
        content: [
          { text: 'Primera línea', type: 'text' },
          { type: 'hard_break' },
          { text: 'segunda línea', type: 'text' },
        ],
        type: 'paragraph',
      },
      { content: [{ text: 'Otro párrafo', type: 'text' }], type: 'paragraph' },
    ]);
  });

  it('is a page the content contract accepts', () => {
    expect(pageContentSchema.safeParse(buildMcpRowContent('Hola\n\nChao')).success).toBe(true);
  });
});
