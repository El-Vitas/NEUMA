import { describe, expect, test } from 'bun:test';
import type { McpPage } from '../../../../src/modules/mcp/types/mcp.types';

const page: McpPage = {
  content: {
    content: [{ content: [{ text: 'Run this first', type: 'text' }], type: 'paragraph' }],
    schemaVersion: 1,
    type: 'doc',
  },
  id: 'page-1',
  lifecycle: 'ACTIVE',
  order: 0,
  parentId: null,
  propertyValues: null,
  spaceId: 'space-1',
  title: 'Runbook',
  version: 1,
};

describe('MCP page type', () => {
  test('exposes canonical structured content to MCP consumers', () => {
    expect(page.content).toEqual({
      content: [{ content: [{ text: 'Run this first', type: 'text' }], type: 'paragraph' }],
      schemaVersion: 1,
      type: 'doc',
    });
  });
});
