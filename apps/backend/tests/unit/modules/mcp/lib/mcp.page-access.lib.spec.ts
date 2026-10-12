import { describe, expect, it } from 'bun:test';
import {
  MCP_CONCURRENT_CHANGE_MESSAGE,
  MCP_INACCESSIBLE_MESSAGE,
  MCP_PAGE_LOCKED_MESSAGE,
  MCP_REFUSAL_EXPLANATIONS,
  MCP_REFUSED_CHANGE_PREFIX,
  MCP_UNREADABLE_ADDRESS_MESSAGE,
} from '@/modules/mcp/constants/mcp.constants';
import { McpToolError } from '@/modules/mcp/infrastructure/errors/mcp.tool.error';
import { explainMcpRefusal, readMcpPageId } from '@/modules/mcp/lib/mcp.page-access.lib';

const PAGE = '0199a1c2-0000-7000-8000-000000000001';

describe('explainMcpRefusal', () => {
  it('says the same about a page the token cannot see and a collection that is not there', () => {
    expect(explainMcpRefusal({ code: 'PAGE_ACCESS_DENIED', details: { pageId: PAGE } })).toBe(MCP_INACCESSIBLE_MESSAGE);
    expect(explainMcpRefusal({ code: 'PAGE_SCHEMA_NOT_FOUND', details: undefined })).toBe(MCP_INACCESSIBLE_MESSAGE);
  });

  it('sends a locked page to a person, and a change someone else made to reading again', () => {
    expect(explainMcpRefusal({ code: 'PAGE_LOCKED', details: undefined })).toBe(MCP_PAGE_LOCKED_MESSAGE);
    expect(explainMcpRefusal({ code: 'PAGE_VIEW_NOT_FOUND', details: undefined })).toBe(MCP_CONCURRENT_CHANGE_MESSAGE);
  });

  it('explains the refusals it knows in words of their own', () => {
    expect(explainMcpRefusal({ code: 'PAGE_CYCLE', details: undefined })).toBe(
      MCP_REFUSAL_EXPLANATIONS.get('PAGE_CYCLE') ?? 'an explanation for PAGE_CYCLE',
    );
  });

  it('passes on what was wrong with what the agent wrote, so it can fix it', () => {
    expect(explainMcpRefusal({ code: 'PAGE_CONTENT_INVALID', details: 'A table row has too many cells' })).toBe(
      `${MCP_REFUSED_CHANGE_PREFIX} A table row has too many cells`,
    );
    expect(explainMcpRefusal({ code: 'SCHEMA_VIEW_INVALID', details: { column: 'status' } })).toBe(
      `${MCP_REFUSED_CHANGE_PREFIX} {"column":"status"}`,
    );
  });

  it('says only the code of a refusal it does not know, never its details', () => {
    const explained = explainMcpRefusal({ code: 'SOMETHING_NEW', details: { hiddenTitle: 'Salaries 2027' } });

    expect(explained).toBe(`${MCP_REFUSED_CHANGE_PREFIX} SOMETHING_NEW`);
    expect(explained).not.toContain('Salaries');
  });
});

describe('readMcpPageId', () => {
  it('reads the page of a link and of a bare id', () => {
    expect(readMcpPageId(`https://brain.example.com/es/spaces/space-a/pages/${PAGE}`)).toBe(PAGE);
    expect(readMcpPageId(PAGE)).toBe(PAGE);
  });

  it('refuses what is neither, saying what to pass', () => {
    const attempt = (): string => readMcpPageId('the roadmap page');

    expect(attempt).toThrow(McpToolError);
    expect(attempt).toThrow(MCP_UNREADABLE_ADDRESS_MESSAGE);
  });
});
