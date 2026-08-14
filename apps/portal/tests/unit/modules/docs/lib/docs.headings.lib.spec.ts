import { describe, expect, it } from 'bun:test';
import { readDocsHeadings } from '@/modules/docs/lib/docs.headings.lib';

describe('what a document can be jumped into', () => {
  it('takes the two levels below the title, each with a name of its own', () => {
    const markdown = ['# Título', '', '## Cómo insertar uno', '', '### Un detalle', '', '#### Demasiado hondo'].join(
      '\n',
    );

    expect(readDocsHeadings(markdown)).toEqual([
      { depth: 2, id: 'cómo-insertar-uno', title: 'Cómo insertar uno' },
      { depth: 3, id: 'un-detalle', title: 'Un detalle' },
    ]);
  });

  /** A hash inside fenced writing is a comment or a colour, and never a heading. */
  it('leaves alone what is fenced off as code', () => {
    const markdown = ['## De verdad', '', '```mermaid', 'flowchart TD', '  A[#no es un título] --> B', '```'].join(
      '\n',
    );

    expect(readDocsHeadings(markdown).map((heading) => heading.title)).toEqual(['De verdad']);
  });

  /** Two headings called the same thing cannot answer to the same name. */
  it('gives a name of its own to each of two headings called the same', () => {
    const markdown = ['## Ejemplo', '', '## Ejemplo'].join('\n');

    expect(readDocsHeadings(markdown).map((heading) => heading.id)).toEqual(['ejemplo', 'ejemplo-1']);
  });
});
