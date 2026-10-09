import { PAGE_CONTENT_SCHEMA_VERSION, type PageContent } from '@neuma/shared';
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

/** No text yields one empty paragraph, as a row created in the portal. */
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
