import { describe, expect, it } from 'bun:test';
import { buildMcpPageUrl, readMcpAddress } from '@/modules/mcp/lib/mcp.address.lib';

const SPACE = '01a0e96d-47b0-71af-8ffc-421da30ed712';
const PAGE = '01a0e96d-4877-75dc-bf09-19a2af324969';
const BLOCK = '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b';

describe('readMcpAddress', () => {
  it('reads a page link copied from the portal, whatever the domain and the language', () => {
    expect(readMcpAddress(`https://brain.example.com/es/spaces/${SPACE}/pages/${PAGE}`)).toEqual({
      blockId: null,
      kind: 'page',
      pageId: PAGE,
    });
    expect(readMcpAddress(`http://localhost:3010/spaces/${SPACE}/pages/${PAGE}`)).toEqual({
      blockId: null,
      kind: 'page',
      pageId: PAGE,
    });
  });

  it('reads the block a link points at', () => {
    expect(readMcpAddress(`https://brain.example.com/en/spaces/${SPACE}/pages/${PAGE}#${BLOCK}`)).toEqual({
      blockId: BLOCK,
      kind: 'page',
      pageId: PAGE,
    });
  });

  it('reads just the path, and a page id with its block after a hash', () => {
    expect(readMcpAddress(`/spaces/${SPACE}/pages/${PAGE}#${BLOCK}`)).toMatchObject({ blockId: BLOCK, pageId: PAGE });
    expect(readMcpAddress(`${PAGE}#${BLOCK}`)).toMatchObject({ blockId: BLOCK, kind: 'page', pageId: PAGE });
  });

  it('reads a bare id without deciding whether it is a page or a block', () => {
    expect(readMcpAddress(`  ${BLOCK}  `)).toEqual({ id: BLOCK, kind: 'id' });
  });

  it('turns down anything that is not a Neuma link or id', () => {
    expect(readMcpAddress('https://example.com/some/page')).toEqual({ kind: 'invalid' });
    expect(readMcpAddress(`/spaces/${SPACE}/pages/not-an-id`)).toEqual({ kind: 'invalid' });
    expect(readMcpAddress(`${PAGE}#not-an-id`)).toEqual({ kind: 'invalid' });
    expect(readMcpAddress('')).toEqual({ kind: 'invalid' });
  });
});

describe('buildMcpPageUrl', () => {
  it('builds the link a person opens, without a language so the portal picks theirs', () => {
    expect(buildMcpPageUrl('https://brain.example.com', SPACE, PAGE, null)).toBe(
      `https://brain.example.com/spaces/${SPACE}/pages/${PAGE}`,
    );
  });

  it('points at the block when there is one, and does not mind a trailing slash', () => {
    expect(buildMcpPageUrl('https://brain.example.com/', SPACE, PAGE, BLOCK)).toBe(
      `https://brain.example.com/spaces/${SPACE}/pages/${PAGE}#${BLOCK}`,
    );
  });
});
