import { describe, expect, it } from 'bun:test';
import { envSchema, findMissingProductionVariables } from '../../../../schemas/env.schema';

describe('envSchema', () => {
  it('has no block editor flag: the block editor is the only editor', () => {
    const parsed = envSchema.parse({ NEXT_PUBLIC_BLOCK_EDITOR: 'false' });

    expect(Object.keys(parsed)).not.toContain('NEXT_PUBLIC_BLOCK_EDITOR');
  });

  it('keeps the socket address the browser connects to', () => {
    expect(envSchema.parse({}).NEXT_PUBLIC_LIVE_WS_URL).toBe('ws://localhost:3000/api/v1/blocks/live');
  });
});

describe('findMissingProductionVariables', () => {
  const complete = {
    BACKEND_URL: 'http://backend:3000',
    MCP_PUBLIC_URL: 'https://neuma.example/api/v1/mcp',
    NEXT_PUBLIC_LIVE_WS_URL: 'wss://neuma.example/api/v1/blocks/live',
    NODE_ENV: 'production',
  };

  it('names every address a production server is missing', () => {
    expect(findMissingProductionVariables({ NODE_ENV: 'production' })).toEqual([
      'BACKEND_URL',
      'MCP_PUBLIC_URL',
      'NEXT_PUBLIC_LIVE_WS_URL',
    ]);
  });

  it('accepts a production server that has them all', () => {
    expect(findMissingProductionVariables(complete)).toEqual([]);
  });

  it('lets development fall back to the local addresses', () => {
    expect(findMissingProductionVariables({ NODE_ENV: 'development' })).toEqual([]);
    expect(findMissingProductionVariables({})).toEqual([]);
  });
});
