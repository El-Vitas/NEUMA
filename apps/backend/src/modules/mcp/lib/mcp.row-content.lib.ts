import { PAGE_CONTENT_SCHEMA_VERSION, type PageContent } from '@company-brain/shared';
import {
  MCP_EMPTY_PARAGRAPH_NODE,
  MCP_HARD_BREAK_NODE,
  MCP_LINE_SEPARATOR,
  MCP_PARAGRAPH_SEPARATOR,
} from '../constants/mcp.constants';

const buildText = (text: string) => ({ text, type: 'text' }) as const;

const buildParagraph = (text: string) =>
  ({
    content: text
      .split(MCP_LINE_SEPARATOR)
      .flatMap((line, at) => (at === 0 ? [buildText(line)] : [MCP_HARD_BREAK_NODE, buildText(line)])),
    type: 'paragraph',
  }) as const;

/**
 * Lo que dice la página de una fila nueva, a partir del texto del agente.
 *
 * Cada parte entre líneas en blanco es un párrafo, y un salto de línea suelto
 * sigue siendo un salto dentro de su párrafo. Sin texto, la fila nace con un
 * párrafo vacío, igual que una fila creada en el portal.
 */
export const buildMcpRowContent = (text: string | undefined): PageContent => {
  const paragraphs = (text ?? '')
    .split(MCP_PARAGRAPH_SEPARATOR)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '');
  return {
    content: paragraphs.length === 0 ? [MCP_EMPTY_PARAGRAPH_NODE] : paragraphs.map(buildParagraph),
    schemaVersion: PAGE_CONTENT_SCHEMA_VERSION,
    type: 'doc',
  };
};
